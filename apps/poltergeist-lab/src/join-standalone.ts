const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";
const BATCH_INTERVAL_MS = 50;

interface SensorSample {
  readonly t: number;
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
}

function getRoomCode(): string {
  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery = searchParams.get("code");
  if (fromQuery) return fromQuery.toUpperCase();

  const match = window.location.pathname.match(/\/join\/([A-Za-z0-9]+)/);
  if (match && match[1]) return match[1].toUpperCase();

  return "";
}

function init() {
  const code = getRoomCode();
  const codeLabel = document.getElementById("room-code-label");
  const beginBtn = document.getElementById("begin-btn") as HTMLButtonElement | null;
  const statusText = document.getElementById("status-text");
  const troubleBox = document.getElementById("trouble-box");

  if (codeLabel && code) {
    codeLabel.textContent = code;
  }

  let ws: WebSocket | null = null;
  let buffer: SensorSample[] = [];
  let batchTimer: ReturnType<typeof setInterval> | null = null;
  let wakeLock: WakeLockSentinel | null = null;

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* wakeLock unsupported or denied */
    }
  }

  function showTrouble(title: string, desc: string) {
    if (!troubleBox) return;
    troubleBox.innerHTML = `<strong>${title}</strong><p style="margin-top: 6px; color: #ccbbbb;">${desc}</p>`;
    troubleBox.style.display = "block";
    if (statusText) statusText.textContent = "Summoning halted.";
    if (beginBtn) {
      beginBtn.disabled = false;
      beginBtn.textContent = "Retry";
    }
  }

  function handleOrientation(e: DeviceOrientationEvent) {
    buffer.push({
      t: Date.now(),
      alpha: e.alpha ?? 0,
      beta: e.beta ?? 0,
      gamma: e.gamma ?? 0,
      ax: 0,
      ay: 0,
      az: 0,
    });
  }

  function handleMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const last = buffer[buffer.length - 1];
    if (last) {
      buffer[buffer.length - 1] = {
        ...last,
        ax: acc.x ?? 0,
        ay: acc.y ?? 0,
        az: acc.z ?? 0,
      };
    }
  }

  function flushBatch() {
    if (!ws || ws.readyState !== WebSocket.OPEN || buffer.length === 0) return;
    const toSend = buffer;
    buffer = [];
    ws.send(
      JSON.stringify({
        type: "batch",
        channels: {
          orientation: toSend.map((s) => ({
            t: s.t,
            v: [s.alpha, s.beta, s.gamma],
          })),
          accel: toSend.map((s) => ({
            t: s.t,
            v: [s.ax, s.ay, s.az],
          })),
        },
      }),
    );
  }

  async function start() {
    if (!code) {
      showTrouble("Room Code Missing", "No room code provided. Please scan the QR code from the lab display.");
      return;
    }

    if (!window.isSecureContext) {
      showTrouble("Insecure Context", "Sensor access requires HTTPS or localhost.");
      return;
    }

    if (!("DeviceOrientationEvent" in window)) {
      showTrouble("Sensors Unavailable", "Your browser does not report device motion or orientation sensors.");
      return;
    }

    // iOS 13+ permission request
    const motionWithPerm = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof motionWithPerm.requestPermission === "function") {
      try {
        const resp = await motionWithPerm.requestPermission();
        if (resp !== "granted") {
          showTrouble("Permission Denied", "Motion sensor access was denied. Reload to allow.");
          return;
        }
      } catch {
        showTrouble("Permission Error", "Could not request motion sensor permission.");
        return;
      }
    }

    if (beginBtn) {
      beginBtn.disabled = true;
      beginBtn.textContent = "Connecting...";
    }
    if (statusText) statusText.textContent = "Reaching relay server...";
    if (troubleBox) troubleBox.style.display = "none";

    try {
      ws = new WebSocket(RELAY_URL);
    } catch (err) {
      showTrouble("Relay Unreachable", `Could not connect to ${RELAY_URL}. Check network connection.`);
      return;
    }

    ws.addEventListener("open", () => {
      ws?.send(
        JSON.stringify({
          type: "hello",
          version: 1,
          role: "peer",
          roomCode: code,
        }),
      );
    });

    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "welcome") {
          if (statusText) statusText.textContent = "👻 Phone Possessed! Streaming sensors to lab...";
          if (beginBtn) {
            beginBtn.textContent = "Streaming Live";
            beginBtn.style.background = "#2a5c3a";
            beginBtn.style.borderColor = "#4a9c6a";
          }
          requestWakeLock();
          window.addEventListener("deviceorientation", handleOrientation);
          window.addEventListener("devicemotion", handleMotion);
          batchTimer = setInterval(flushBatch, BATCH_INTERVAL_MS);
        } else if (msg.type === "error") {
          showTrouble("Relay Error", msg.message || "Failed to join room.");
        }
      } catch {
        /* ignore parse error */
      }
    });

    ws.addEventListener("error", () => {
      showTrouble("Relay Connection Lost", "Connection to the room server was interrupted.");
    });

    ws.addEventListener("close", () => {
      if (batchTimer) clearInterval(batchTimer);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("devicemotion", handleMotion);
      wakeLock?.release().catch(() => {});
    });
  }

  beginBtn?.addEventListener("click", () => {
    start();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
