/**
 * Lightweight phone join page (/join.html?code=XXXX): no React, so the phone loads only a few kB
 * before joining. Flow: type your name → Join → stream motion + orientation to the laptop through
 * the relay (phone-bridge protocol, canonical units). After joining, the phone shows its own 3D
 * ghost (three.js is loaded only then), a hold-to-sing pad and the Choir instrument picker.
 */
import {
  encodeBatch,
  PROTOCOL_VERSION,
  buildPhoneChannels,
  motionSample,
  orientationSample,
  sanitizeName,
  INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  INSTRUMENT_COOLDOWN_MS,
  isInstrumentId,
  type InstrumentId,
  type MotionSample,
  type OrientationSample,
  type TouchSample,
} from "seance-core/transports/phone-bridge";
import { relayUrl } from "./relay-url.js";

const BATCH_INTERVAL_MS = 50;
const CAPABILITIES = ["accelG", "accel", "gyro", "orientation", "control.touch"] as const;
const NAME_KEY = "seance-player-name";
const INSTRUMENT_KEY = "seance-player-instrument";
/** Linear acceleration (m/s², gravity removed) that counts as a shake. */
const SHAKE_MS2 = 14;
const DIZZY_HOLD_MS = 3200;
const GHOST_COLORS = ["#00ffff", "#ff00ff", "#ffff33", "#00ff99", "#ff7a00", "#bd00ff"];

interface GhostHandle {
  setLook(look: { mouth?: number; dizzy?: number }): void;
}

function getRoomCode(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("code");
  if (fromQuery) return fromQuery.toUpperCase();
  const match = window.location.pathname.match(/\/join\/([A-Za-z0-9]+)/);
  return match?.[1]?.toUpperCase() ?? "";
}

function stored(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

type PermissionFn = (() => Promise<"granted" | "denied" | string>) | undefined;

/** iOS 13+ needs BOTH motion and orientation permission, requested inside the user's tap. */
async function requestSensorPermissions(): Promise<"granted" | "denied" | "error"> {
  const motionReq = (globalThis.DeviceMotionEvent as unknown as { requestPermission?: PermissionFn } | undefined)?.requestPermission;
  const orientReq = (globalThis.DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn } | undefined)?.requestPermission;
  try {
    for (const req of [motionReq, orientReq]) {
      if (typeof req === "function" && (await req()) !== "granted") return "denied";
    }
    return "granted";
  } catch {
    return "error";
  }
}

/** Load three.js + the ghost only after joining, so the first page load stays tiny. */
async function mountGhost(box: HTMLElement, name: string, color: string): Promise<GhostHandle | null> {
  try {
    const { GhostScene, webglAvailable } = await import("seance-avatars/ghost3d");
    if (!webglAvailable()) throw new Error("no webgl");
    const scene = new GhostScene(box, { interactive: true, autoRotate: true });
    scene.setGhosts([{ id: "me", name, look: { color } }]);
    return { setLook: (look) => scene.update("me", look) };
  } catch {
    const fallback = document.createElement("div");
    fallback.className = "ghost-fallback";
    fallback.textContent = "👻 " + name;
    box.replaceChildren(fallback);
    return null;
  }
}

function init() {
  const code = getRoomCode();
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const codeLabel = $("room-code-label");
  const form = $<HTMLFormElement>("name-form");
  const nameInput = $<HTMLInputElement>("name-input");
  const beginBtn = $<HTMLButtonElement>("begin-btn");
  const statusText = $("status-text");
  const troubleBox = $("trouble-box");
  const live = $("live");
  const hello = $("hello");
  const ghostBox = $("ghost-box");
  const singPad = $("sing-pad");
  const instrGrid = $("instr-grid");
  const instrStatus = $("instr-status");
  const url = relayUrl();

  if (codeLabel && code) codeLabel.textContent = code;

  let ws: WebSocket | null = null;
  let seq = 0;
  let motionBuffer: MotionSample[] = [];
  let orientBuffer: OrientationSample[] = [];
  let touchBuffer: TouchSample[] = [];
  let batchTimer: ReturnType<typeof setInterval> | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let streaming = false;
  let playerName = "";
  let instrument: InstrumentId = isInstrumentId(stored(INSTRUMENT_KEY)) ? (stored(INSTRUMENT_KEY) as InstrumentId) : DEFAULT_INSTRUMENT;
  let cooldownUntil = 0;
  let ghost: GhostHandle | null = null;
  let dizzyCount = 0;
  let dizzyUntil = 0;
  const ghostColor = GHOST_COLORS[Math.floor(Math.random() * GHOST_COLORS.length)]!;

  function setStatus(text: string) {
    if (statusText) statusText.textContent = text;
  }

  // ---- Step 1: name ----
  if (nameInput) {
    nameInput.value = stored(NAME_KEY);
    const sync = () => {
      if (beginBtn) beginBtn.disabled = !sanitizeName(nameInput.value);
    };
    nameInput.addEventListener("input", sync);
    sync();
  }

  function showTrouble(title: string, desc: string) {
    if (troubleBox) {
      troubleBox.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = title;
      const p = document.createElement("p");
      p.style.marginTop = "6px";
      p.textContent = desc;
      troubleBox.append(strong, p);
      troubleBox.hidden = false;
    }
    setStatus("Summoning halted.");
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.textContent = "Retry";
    }
  }

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      /* unsupported or denied: the page asks the user to keep the screen on */
    }
  }

  function handleOrientation(e: DeviceOrientationEvent) {
    orientBuffer.push(orientationSample(e.timeStamp || performance.now(), e.alpha, e.beta, e.gamma));
  }

  function handleMotion(e: DeviceMotionEvent) {
    motionBuffer.push(motionSample(e.timeStamp || performance.now(), e.accelerationIncludingGravity, e.acceleration, e.rotationRate));
    // Local fun: shake the phone and your own ghost gets dizzy too.
    const a = e.acceleration;
    if (ghost && a && a.x != null && a.y != null && a.z != null) {
      const now = Date.now();
      if (now > dizzyUntil && Math.hypot(a.x, a.y, a.z) > SHAKE_MS2) {
        dizzyUntil = now + DIZZY_HOLD_MS;
        ghost.setLook({ dizzy: ++dizzyCount });
        if ("vibrate" in navigator) navigator.vibrate([40, 60, 40]);
      }
    }
  }

  function flushBatch() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (motionBuffer.length === 0 && orientBuffer.length === 0 && touchBuffer.length === 0) return;
    const channels = buildPhoneChannels(motionBuffer, orientBuffer, touchBuffer);
    motionBuffer = [];
    orientBuffer = [];
    touchBuffer = [];
    seq++;
    ws.send(JSON.stringify({ type: "batch", payload: encodeBatch(seq, channels) }));
  }

  function sendReady() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "ready", capabilities: CAPABILITIES, name: playerName, instrument }));
  }

  // ---- Hold-to-sing pad (used when the laptop is on the Banshee Choir) ----
  function touch(e: PointerEvent, down: boolean) {
    if (!streaming || !singPad) return;
    e.preventDefault();
    const r = singPad.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    touchBuffer.push({ t: performance.now(), x, y, down });
    singPad.classList.toggle("active", down);
    ghost?.setLook({ mouth: down ? 0.9 : 0 });
    flushBatch(); // gate changes should be heard immediately
  }
  singPad?.addEventListener("pointerdown", (e) => {
    singPad.setPointerCapture(e.pointerId);
    touch(e, true);
  });
  singPad?.addEventListener("pointerup", (e) => touch(e, false));
  singPad?.addEventListener("pointercancel", (e) => touch(e, false));

  // ---- Instrument picker (10 s cooldown between switches) ----
  function renderInstruments() {
    if (!instrGrid) return;
    const now = Date.now();
    const cooling = streaming && now < cooldownUntil;
    instrGrid.replaceChildren(
      ...INSTRUMENTS.map((ins) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ins";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(ins.id === instrument));
        b.disabled = cooling && ins.id !== instrument;
        const title = document.createElement("span");
        title.textContent = `${ins.emoji} ${ins.label}`;
        const hint = document.createElement("small");
        hint.textContent = ins.hint;
        b.append(title, hint);
        b.addEventListener("click", () => pickInstrument(ins.id));
        return b;
      }),
    );
    if (instrStatus) {
      instrStatus.textContent = cooling
        ? `Instrument changed — next switch in ${Math.ceil((cooldownUntil - now) / 1000)} s`
        : "Choir instrument — switch any time (10 s cooldown)";
    }
    if (cooling) setTimeout(renderInstruments, 500);
  }

  function pickInstrument(id: InstrumentId) {
    if (id === instrument) return;
    const now = Date.now();
    if (streaming) {
      if (now < cooldownUntil) return;
      cooldownUntil = now + INSTRUMENT_COOLDOWN_MS;
    }
    instrument = id;
    store(INSTRUMENT_KEY, id);
    sendReady();
    if ("vibrate" in navigator) navigator.vibrate(15);
    renderInstruments();
  }
  renderInstruments();

  function stopStreaming() {
    streaming = false;
    if (batchTimer) clearInterval(batchTimer);
    batchTimer = null;
    window.removeEventListener("deviceorientation", handleOrientation);
    window.removeEventListener("devicemotion", handleMotion);
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }

  function startStreaming() {
    if (streaming) return;
    streaming = true;
    requestWakeLock();
    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("devicemotion", handleMotion);
    batchTimer = setInterval(flushBatch, BATCH_INTERVAL_MS);
  }

  async function start() {
    const clean = sanitizeName(nameInput?.value ?? "");
    if (!clean) {
      setStatus("Type a name first.");
      nameInput?.focus();
      return;
    }
    if (!code) {
      showTrouble("Room code missing", "Scan the QR code shown on the laptop.");
      return;
    }
    if (!window.isSecureContext) {
      showTrouble("Needs HTTPS", "Phones only share motion sensors with secure (https://) pages.");
      return;
    }
    if (!("DeviceMotionEvent" in window) && !("DeviceOrientationEvent" in window)) {
      showTrouble("Sensors unavailable", "This browser doesn't report motion or orientation.");
      return;
    }

    // Must happen inside the tap (iOS).
    const permission = await requestSensorPermissions();
    if (permission !== "granted") {
      showTrouble(
        permission === "denied" ? "Motion access denied" : "Permission error",
        "Allow Motion & Orientation access (iPhone: Settings → Safari → Motion & Orientation Access), then reload.",
      );
      return;
    }

    playerName = clean;
    store(NAME_KEY, clean);
    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.textContent = "Connecting…";
    }
    setStatus("Reaching the séance…");
    if (troubleBox) troubleBox.hidden = true;

    try {
      ws = new WebSocket(url);
    } catch {
      showTrouble("Relay unreachable", `Could not connect to ${url}.`);
      return;
    }

    ws.addEventListener("open", () => {
      ws?.send(JSON.stringify({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode: code }));
    });

    ws.addEventListener("message", (e) => {
      let msg: { type?: string; [k: string]: unknown };
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome":
          sendReady();
          startStreaming();
          if (form) form.hidden = true;
          if (live) live.hidden = false;
          if (hello) hello.textContent = `👻 ${playerName}, YOU'RE IN!`;
          setStatus("Streaming to the laptop. Keep this screen on — the laptop can switch between the Lab and the Choir without you rejoining.");
          renderInstruments();
          if (ghostBox && !ghost) {
            void mountGhost(ghostBox, playerName, ghostColor).then((g) => {
              ghost = g;
            });
          }
          break;
        case "sync": {
          // NTP-style: t1 = receive time, t2 = send time (phone clock). The host records t3 on receipt.
          const t1 = performance.now();
          ws?.send(JSON.stringify({ type: "sync-reply", t0: msg["t0"], t1, t2: performance.now(), t3: 0 }));
          break;
        }
        case "instruct":
          if ("speechSynthesis" in window && typeof msg["text"] === "string") {
            try {
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg["text"]));
            } catch {
              /* speech unavailable */
            }
          }
          setStatus(String(msg["text"] ?? ""));
          break;
        case "room-paused":
          setStatus("The laptop is switching pages… stay here, you'll reconnect automatically.");
          break;
        case "room-resumed":
          setStatus("👻 The laptop is back. Still streaming — keep this screen on.");
          break;
        case "error":
          showTrouble("Relay error", String(msg["message"] ?? "Failed to join the room."));
          break;
      }
    });

    ws.addEventListener("error", () => {
      showTrouble("Relay connection lost", "The connection to the room server was interrupted.");
    });

    ws.addEventListener("close", stopStreaming);
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void start();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
