/**
 * Lightweight phone join page (/join.html?code=XXXX): no React, so the phone loads only a few kB
 * before the "Begin" tap. Streams motion + orientation to the laptop through the relay using the
 * phone-bridge protocol (encodeBatch) in canonical units.
 */
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
import { relayUrl } from "./relay-url.js";

const BATCH_INTERVAL_MS = 50;
const CAPABILITIES = ["accelG", "accel", "gyro", "orientation", "control.touch"] as const;

function getRoomCode(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("code");
  if (fromQuery) return fromQuery.toUpperCase();
  const match = window.location.pathname.match(/\/join\/([A-Za-z0-9]+)/);
  return match?.[1]?.toUpperCase() ?? "";
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

function init() {
  const code = getRoomCode();
  const codeLabel = document.getElementById("room-code-label");
  const beginBtn = document.getElementById("begin-btn") as HTMLButtonElement | null;
  const statusText = document.getElementById("status-text");
  const troubleBox = document.getElementById("trouble-box");
  const url = relayUrl();

  if (codeLabel && code) codeLabel.textContent = code;

  let ws: WebSocket | null = null;
  let seq = 0;
  let motionBuffer: MotionSample[] = [];
  let orientBuffer: OrientationSample[] = [];
  let touchBuffer: TouchSample[] = [];
  const singPad = document.getElementById("sing-pad");
  let batchTimer: ReturnType<typeof setInterval> | null = null;
  let wakeLock: WakeLockSentinel | null = null;
  let streaming = false;

  function setStatus(text: string) {
    if (statusText) statusText.textContent = text;
  }

  function showTrouble(title: string, desc: string) {
    if (troubleBox) {
      troubleBox.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = title;
      const p = document.createElement("p");
      p.style.marginTop = "6px";
      p.style.color = "#ccbbbb";
      p.textContent = desc;
      troubleBox.append(strong, p);
      troubleBox.style.display = "block";
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

  // "Hold to sing" pad: used when the laptop switches to the Banshee Choir (same room, no rejoin).
  function touch(e: PointerEvent, down: boolean) {
    if (!streaming || !singPad) return;
    e.preventDefault();
    const r = singPad.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    touchBuffer.push({ t: performance.now(), x, y, down });
    singPad.classList.toggle("active", down);
    flushBatch(); // gate changes should be heard immediately
  }
  singPad?.addEventListener("pointerdown", (e) => {
    singPad.setPointerCapture(e.pointerId);
    touch(e, true);
  });
  singPad?.addEventListener("pointerup", (e) => touch(e, false));
  singPad?.addEventListener("pointercancel", (e) => touch(e, false));

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
    if (singPad) singPad.style.display = "flex";
  }

  async function start() {
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

    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.textContent = "Connecting…";
    }
    setStatus("Reaching the relay…");
    if (troubleBox) troubleBox.style.display = "none";

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
          setStatus("👻 Possessed! Your phone is streaming to the laptop. Keep this screen on — the laptop can switch between the Lab and the Choir without you rejoining.");
          if (beginBtn) {
            beginBtn.textContent = "Streaming live";
            beginBtn.style.background = "#2a5c3a";
            beginBtn.style.borderColor = "#4a9c6a";
          }
          ws?.send(JSON.stringify({ type: "ready", capabilities: CAPABILITIES }));
          startStreaming();
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

  beginBtn?.addEventListener("click", () => {
    void start();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
