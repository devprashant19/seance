import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { SpiritTrouble, type SpiritTroubleCode } from "seance-avatars";
import {
  encodeBatch,
  PROTOCOL_VERSION,
  buildPhoneChannels,
  motionSample,
  orientationSample,
  type MotionSample,
  type OrientationSample,
  type TouchSample,
} from "seance-core/transports/phone-bridge";
import { relayUrl } from "../relay-url.js";

const BATCH_INTERVAL_MS = 50;
const CAPABILITIES = ["accelG", "accel", "gyro", "orientation", "control.touch"];

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

export function JoinChoir() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? "").toUpperCase();
  const [phase, setPhase] = useState<"idle" | "connecting" | "singing-ready">("idle");
  const [trouble, setTrouble] = useState<SpiritTroubleCode | null>(null);
  const [touching, setTouching] = useState(false);
  const [tilt, setTilt] = useState(0.5); // 0 = low, 1 = high (display only)
  const [hostAway, setHostAway] = useState(false); // laptop switching pages: keep streaming, it comes back

  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const motionRef = useRef<MotionSample[]>([]);
  const orientRef = useRef<OrientationSample[]>([]);
  const touchRef = useRef<TouchSample[]>([]);
  const seqRef = useRef(0);

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
    if (phase !== "singing-ready") return;
    const onMotion = (e: DeviceMotionEvent) => {
      motionRef.current.push(motionSample(e.timeStamp || performance.now(), e.accelerationIncludingGravity, e.acceleration, e.rotationRate));
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      orientRef.current.push(orientationSample(e.timeStamp || performance.now(), e.alpha, e.beta, e.gamma));
      // Same mapping the laptop uses (beta −45°…+45° → low…high), shown so singers can aim.
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

  useEffect(() => () => {
    wsRef.current?.close();
    void wakeLockRef.current?.release().catch(() => {});
  }, []);

  const begin = useCallback(async () => {
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
        ws.send(JSON.stringify({ type: "ready", capabilities: CAPABILITIES }));
        setPhase("singing-ready");
      } else if (msg.type === "room-paused") {
        setHostAway(true);
      } else if (msg.type === "room-resumed") {
        setHostAway(false);
      } else if (msg.type === "sync") {
        const t1 = performance.now();
        ws.send(JSON.stringify({ type: "sync-reply", t0: msg["t0"], t1, t2: performance.now(), t3: 0 }));
      } else if (msg.type === "error") {
        setTrouble(msg["code"] === "ROOM_NOT_FOUND" ? "room-not-found" : "relay-unreachable-phone");
        setPhase("idle");
      }
    });
    ws.addEventListener("error", () => {
      setTrouble("relay-unreachable-phone");
      setPhase("idle");
    });
    ws.addEventListener("close", () => {
      setPhase((p) => (p === "singing-ready" ? "idle" : p));
    });
  }, [code]);

  const pushTouch = useCallback((e: React.PointerEvent, down: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    touchRef.current.push({ t: e.timeStamp || performance.now(), x, y, down });
    flush(); // send touches immediately so the voice starts/stops without delay
  }, [flush]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
      touchAction: "none", userSelect: "none",
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 300, marginBottom: 8, letterSpacing: 1 }}>Banshee Choir</h2>
      <p style={{ color: "#778", marginBottom: 16 }}>Room {code || "?"}</p>

      {trouble && <SpiritTrouble code={trouble} onAction={() => void begin()} />}

      {phase === "idle" && !trouble && (
        <button
          onClick={() => void begin()}
          style={{
            padding: "18px 32px", fontSize: 18, borderRadius: 12, cursor: "pointer",
            background: "linear-gradient(135deg, #223 0%, #335 100%)", border: "1px solid #557", color: "#cde",
          }}
        >
          Join the choir
        </button>
      )}

      {hostAway && phase === "singing-ready" && (
        <p role="status" style={{ color: "#ca8", fontSize: 13 }}>The laptop is switching pages… stay here, it reconnects automatically.</p>
      )}
      {phase === "connecting" && <p style={{ color: "#889" }}>Joining room {code}…</p>}

      {phase === "singing-ready" && (
        <>
          <p style={{ color: "#889", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
            Touch and hold to sing. Tilt forward/back to change the note. Shake for tremolo.
          </p>
          <div
            role="button"
            aria-label="Hold to sing"
            aria-pressed={touching}
            onPointerDown={(e) => { setTouching(true); pushTouch(e, true); if ("vibrate" in navigator) navigator.vibrate(10); }}
            onPointerUp={(e) => { setTouching(false); pushTouch(e, false); }}
            onPointerCancel={(e) => { setTouching(false); pushTouch(e, false); }}
            onPointerLeave={(e) => { if (touching) { setTouching(false); pushTouch(e, false); } }}
            style={{
              width: "min(80vw, 320px)", height: "min(55vh, 380px)",
              borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              background: touching ? "radial-gradient(circle, #334488 0%, #1a1a3a 70%)" : "radial-gradient(circle, #1a1a2e 0%, #111122 70%)",
              border: `2px solid ${touching ? "#5577cc" : "#223"}`, transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <span style={{ fontSize: 48, opacity: touching ? 1 : 0.3 }}>{touching ? "~" : "o"}</span>
          </div>
          <div aria-label="Pitch from tilt" style={{ width: "min(80vw, 320px)", height: 8, marginTop: 16, background: "#1a1a2e", borderRadius: 4 }}>
            <div style={{ width: `${Math.round(tilt * 100)}%`, height: "100%", background: "#6688ff", borderRadius: 4 }} />
          </div>
          <p style={{ fontSize: 12, color: "#667", marginTop: 6 }}>Pitch (tilt)</p>
        </>
      )}
    </main>
  );
}
