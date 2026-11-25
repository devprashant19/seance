import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { SpiritTrouble, Ghost, playerNeon, type SpiritTroubleCode } from "seance-avatars";
import {
  encodeBatch,
  PROTOCOL_VERSION,
  buildPhoneChannels,
  motionSample,
  orientationSample,
  sanitizeName,
  MAX_NAME_LENGTH,
  INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  INSTRUMENT_COOLDOWN_MS,
  isInstrumentId,
  isHostMode,
  instrumentInfo,
  type HostMode,
  type InstrumentId,
  type MotionSample,
  type OrientationSample,
  type TouchSample,
} from "seance-core/transports/phone-bridge";
import { relayUrl } from "../relay-url.js";

const BATCH_INTERVAL_MS = 50;
const CAPABILITIES = ["accelG", "accel", "gyro", "orientation", "control.touch"];
const NAME_KEY = "seance-player-name";
const INSTRUMENT_KEY = "seance-player-instrument";
/** Sing-pad keys: the same 8 notes as the laptop keyboard's A–K. */
const KEY_LABELS = ["A", "S", "D", "F", "G", "H", "J", "K"];

type PermissionFn = (() => Promise<string>) | undefined;

/** iOS 13+ needs both motion and orientation permission, requested inside the user's tap. */
async function requestSensorPermissions(): Promise<boolean> {
  const reqs = [
    (globalThis.DeviceMotionEvent as unknown as { requestPermission?: PermissionFn } | undefined)?.requestPermission,
    (globalThis.DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn } | undefined)?.requestPermission,
  ];
  try {
    for (const req of reqs) {
      if (typeof req === "function" && (await req()) !== "granted") return false;
    }
    return true;
  } catch {
    return false;
  }
}

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: fine, just not remembered */
  }
}

export function JoinChoir() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? "").toUpperCase();
  const [phase, setPhase] = useState<"name" | "connecting" | "singing">("name");
  const [trouble, setTrouble] = useState<SpiritTroubleCode | null>(null);
  const [nameInput, setNameInput] = useState(() => readStored(NAME_KEY));
  const [name, setName] = useState("");
  const [instrument, setInstrument] = useState<InstrumentId>(() => {
    const saved = readStored(INSTRUMENT_KEY);
    return isInstrumentId(saved) ? saved : DEFAULT_INSTRUMENT;
  });
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [touching, setTouching] = useState(false);
  const [tilt, setTilt] = useState(0.5); // 0 = low, 1 = high (display only)
  const [hostAway, setHostAway] = useState(false);
  const [hostMode, setHostMode] = useState<HostMode>("choir");
  const [activeKey, setActiveKey] = useState(-1);
  const padRef = useRef({ down: false, key: -1 });
  const [colorIndex] = useState(() => Math.floor(Math.random() * 9));
  const [dizzy, setDizzy] = useState(0);
  const dizzyUntilRef = useRef(0);

  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const motionRef = useRef<MotionSample[]>([]);
  const orientRef = useRef<OrientationSample[]>([]);
  const touchRef = useRef<TouchSample[]>([]);
  const seqRef = useRef(0);
  const profileRef = useRef({ name: "", instrument });

  const sendReady = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const p = profileRef.current;
    ws.send(JSON.stringify({ type: "ready", capabilities: CAPABILITIES, name: p.name, instrument: p.instrument }));
  }, []);

  const flush = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (motionRef.current.length + orientRef.current.length + touchRef.current.length === 0) return;
    const channels = buildPhoneChannels(motionRef.current, orientRef.current, touchRef.current);
    motionRef.current = [];
    orientRef.current = [];
    touchRef.current = [];
    seqRef.current += 1;
    ws.send(JSON.stringify({ type: "batch", payload: encodeBatch(seqRef.current, channels) }));
  }, []);

  useEffect(() => {
    if (phase !== "singing") return;
    const onMotion = (e: DeviceMotionEvent) => {
      motionRef.current.push(motionSample(e.timeStamp || performance.now(), e.accelerationIncludingGravity, e.acceleration, e.rotationRate));
      // Shake the phone: your ghost gets dizzy (here and on the laptop stage).
      const a = e.acceleration;
      const now = Date.now();
      if (a && a.x != null && a.y != null && a.z != null && now > dizzyUntilRef.current && Math.hypot(a.x, a.y, a.z) > 14) {
        dizzyUntilRef.current = now + 3200;
        setDizzy((n) => n + 1);
        if ("vibrate" in navigator) navigator.vibrate([40, 60, 40]);
      }
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      orientRef.current.push(orientationSample(e.timeStamp || performance.now(), e.alpha, e.beta, e.gamma));
      const beta = Math.max(-45, Math.min(45, e.beta ?? 0));
      setTilt((beta + 45) / 90);
    };
    window.addEventListener("devicemotion", onMotion);
    window.addEventListener("deviceorientation", onOrient);
    const timer = setInterval(flush, BATCH_INTERVAL_MS);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("deviceorientation", onOrient);
      clearInterval(timer);
    };
  }, [phase, flush]);

  // Tick the cooldown countdown.
  useEffect(() => {
    if (cooldownUntil <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 250);
    return () => clearTimeout(t);
  }, [cooldownUntil, now]);

  useEffect(() => () => {
    wsRef.current?.close();
    void wakeLockRef.current?.release().catch(() => {});
  }, []);

  const begin = useCallback(async () => {
    const clean = sanitizeName(nameInput);
    if (!clean) return;
    if (!code) {
      setTrouble("room-not-found");
      return;
    }
    if (!window.isSecureContext) {
      setTrouble("insecure-context");
      return;
    }
    if (!(await requestSensorPermissions())) {
      setTrouble("motion-denied");
      return;
    }
    writeStored(NAME_KEY, clean);
    writeStored(INSTRUMENT_KEY, instrument);
    setName(clean);
    profileRef.current = { name: clean, instrument };
    setTrouble(null);
    setPhase("connecting");
    try {
      if ("wakeLock" in navigator) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      /* the page asks singers to keep the screen on */
    }

    wsRef.current?.close();
    const ws = new WebSocket(relayUrl());
    wsRef.current = ws;
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode: code }));
    });
    ws.addEventListener("message", (e) => {
      let msg: { type?: string; [k: string]: unknown };
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      if (msg.type === "welcome") {
        sendReady();
        setPhase("singing");
      } else if (msg.type === "room-paused") {
        setHostAway(true);
      } else if (msg.type === "room-resumed") {
        setHostAway(false);
      } else if (msg.type === "mode") {
        if (isHostMode(msg["mode"])) setHostMode(msg["mode"]);
      } else if (msg.type === "sync") {
        const t1 = performance.now();
        ws.send(JSON.stringify({ type: "sync-reply", t0: msg["t0"], t1, t2: performance.now(), t3: 0 }));
      } else if (msg.type === "error") {
        setTrouble(msg["code"] === "ROOM_NOT_FOUND" ? "room-not-found" : "relay-unreachable-phone");
        setPhase("name");
      }
    });
    ws.addEventListener("error", () => {
      setTrouble("relay-unreachable-phone");
      setPhase("name");
    });
    ws.addEventListener("close", () => {
      setPhase((p) => (p === "singing" ? "name" : p));
    });
  }, [code, nameInput, instrument, sendReady]);

  const pickInstrument = useCallback((id: InstrumentId) => {
    if (id === instrument) return;
    if (phase === "singing") {
      const t = Date.now();
      if (t < cooldownUntil) return;
      setCooldownUntil(t + INSTRUMENT_COOLDOWN_MS);
      setNow(t);
      profileRef.current = { ...profileRef.current, instrument: id };
      sendReady();
      if ("vibrate" in navigator) navigator.vibrate(15);
    }
    setInstrument(id);
    writeStored(INSTRUMENT_KEY, id);
  }, [instrument, phase, cooldownUntil, sendReady]);

  /** Touch the 8-key pad: the key under the finger is the note; sliding sideways changes it. */
  const pushTouch = useCallback((e: React.PointerEvent, down: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const key = down ? Math.floor(x * KEY_LABELS.length) : -1;
    const prev = padRef.current;
    if (prev.down === down && prev.key === key) return; // only send changes
    padRef.current = { down, key };
    setTouching(down);
    setActiveKey(key);
    touchRef.current.push({ t: e.timeStamp || performance.now(), x, y, down });
    if (down && "vibrate" in navigator) navigator.vibrate(8);
    flush(); // send immediately so notes start/stop/change without delay
  }, [flush]);

  const cooling = phase === "singing" && cooldownUntil > now;
  const secondsLeft = Math.ceil((cooldownUntil - now) / 1000);
  const validName = Boolean(sanitizeName(nameInput));

  return (
    <main className="sx-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, userSelect: phase === "singing" ? "none" : "auto" }}>
      <p className="sx-kicker">Banshee Choir</p>
      <p className="sx-muted" style={{ margin: 0 }}>
        Room <span className="sx-code" style={{ fontSize: 14 }}>{code || "?"}</span>
      </p>

      {trouble && <SpiritTrouble code={trouble} onAction={() => void begin()} />}

      {phase === "name" && (
        <form
          className="sx-box"
          style={{ width: "min(92vw, 380px)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            void begin();
          }}
        >
          <h1 style={{ fontSize: 16, margin: 0, textAlign: "center" }}>Who&apos;s singing?</h1>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="sx-muted" style={{ fontSize: 14 }}>Your name (shown above your ghost)</span>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={MAX_NAME_LENGTH + 4}
              placeholder="PLAYER 1"
              autoComplete="nickname"
              enterKeyHint="go"
              style={{ padding: "12px 14px", fontSize: 20, textAlign: "center", letterSpacing: 2, textTransform: "uppercase" }}
            />
          </label>
          <InstrumentPicker value={instrument} onPick={pickInstrument} />
          <button type="submit" className="sx-btn" disabled={!validName}>
            Join the choir
          </button>
        </form>
      )}

      {phase === "connecting" && <p className="sx-glow-cyan sx-pulse">Joining room {code}…</p>}

      {phase === "singing" && (
        <>
          {hostAway && (
            <p role="status" className="sx-status-wait" style={{ fontSize: 14, margin: 0 }}>
              The laptop is switching pages… stay here, it reconnects automatically.
            </p>
          )}
          <Ghost
            name={name}
            color={playerNeon(colorIndex)}
            mouth={touching ? 0.9 : 0}
            dizzy={dizzy}
            height={210}
            width="min(92vw, 380px)"
            interactive={false}
            label={`Your ghost, ${name}`}
          />
          {hostMode !== "choir" && (
            <p role="status" className="sx-box" style={{ padding: 12, fontSize: 15, width: "min(92vw, 380px)", margin: 0 }}>
              The laptop left the Choir for the {hostMode === "lab" ? "Lab" : hostMode === "possession" ? "ghost view" : "lobby"}.
              Stay here — you're still connected and will sing again when it comes back.
            </p>
          )}
          <p className="sx-muted" style={{ fontSize: 14, margin: 0, textAlign: "center" }}>
            {instrumentInfo(instrument).emoji} Touch a key to sing that note — slide across to change notes.
          </p>
          <div
            role="group"
            aria-label="Sing pad: 8 keys, A to K, like the laptop keyboard"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pushTouch(e, true); }}
            onPointerMove={(e) => { if (padRef.current.down) pushTouch(e, true); }}
            onPointerUp={(e) => pushTouch(e, false)}
            onPointerCancel={(e) => pushTouch(e, false)}
            className={touching ? "sx-box sx-box--pink" : "sx-box"}
            style={{
              width: "min(92vw, 380px)", height: "min(30vh, 220px)", touchAction: "none",
              display: "grid", gridTemplateColumns: `repeat(${KEY_LABELS.length}, 1fr)`, gap: 3, padding: 3,
            }}
          >
            {KEY_LABELS.map((label, i) => (
              <div
                key={label}
                style={{
                  pointerEvents: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8,
                  fontFamily: "var(--sx-font-pixel)", fontSize: 11,
                  color: activeKey === i ? "#fff" : "var(--sx-dim)",
                  background: activeKey === i
                    ? "linear-gradient(180deg, rgba(255,0,255,0.6), rgba(255,0,255,0.25))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,0,255,0.08))",
                  border: `1px solid ${activeKey === i ? "var(--sx-pink)" : "rgba(0,255,255,0.18)"}`,
                  boxShadow: activeKey === i ? "0 0 12px var(--sx-pink)" : "none",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="sx-muted" style={{ fontSize: 13, margin: 0, textAlign: "center" }}>
            Roll the phone = brightness · shake = tremolo (and a dizzy ghost 🌀). In Drone mode, tilt picks the note.
          </p>
          <div style={{ width: "min(92vw, 380px)" }}>
            <p className="sx-muted" style={{ fontSize: 13, margin: "4px 0 6px" }}>
              {cooling ? `Instrument changed — next switch in ${secondsLeft}s` : "Switch instrument any time (10 s cooldown)"}
            </p>
            <InstrumentPicker value={instrument} onPick={pickInstrument} disabled={cooling} />
          </div>
        </>
      )}
    </main>
  );
}

function InstrumentPicker({ value, onPick, disabled = false }: { value: InstrumentId; onPick: (id: InstrumentId) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Instrument" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {INSTRUMENTS.map((ins) => {
        const active = ins.id === value;
        return (
          <button
            key={ins.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled && !active}
            onClick={() => onPick(ins.id)}
            className="sx-ghost-btn"
            style={{
              flexDirection: "column", alignItems: "flex-start", padding: "8px 10px", textAlign: "left",
              borderColor: active ? "var(--sx-pink)" : undefined,
              boxShadow: active ? "0 0 12px rgba(255,0,255,0.55)" : undefined,
              color: active ? "#fff" : undefined,
              opacity: disabled && !active ? 0.45 : 1,
            }}
          >
            <span style={{ fontSize: 15 }}>{ins.emoji} {ins.label}</span>
            <span style={{ fontSize: 11, color: "var(--sx-muted)", letterSpacing: 0 }}>{ins.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
