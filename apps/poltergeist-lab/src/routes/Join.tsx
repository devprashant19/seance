import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";
const BATCH_INTERVAL_MS = 50;

type ConnectionState = "connecting" | "connected" | "error" | "unsupported";

interface SensorSample {
  readonly t: number;
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
}

function isSecureContext(): boolean {
  return window.isSecureContext;
}

function hasDeviceOrientation(): boolean {
  return "DeviceOrientationEvent" in window;
}

export function Join() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<ConnectionState>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<SensorSample[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch { /* wake lock unavailable */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const flushBatch = useCallback(() => {
    const ws = wsRef.current;
    const samples = bufferRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || samples.length === 0) return;
    ws.send(JSON.stringify({
      type: "batch",
      channels: {
        orientation: samples.map((s) => ({
          t: s.t, v: [s.alpha, s.beta, s.gamma],
        })),
        accel: samples.map((s) => ({
          t: s.t, v: [s.ax, s.ay, s.az],
        })),
      },
    }));
    bufferRef.current = [];
  }, []);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    bufferRef.current = [...bufferRef.current, {
      t: Date.now(),
      alpha: e.alpha ?? 0,
      beta: e.beta ?? 0,
      gamma: e.gamma ?? 0,
      ax: 0, ay: 0, az: 0,
    }];
  }, []);

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const last = bufferRef.current[bufferRef.current.length - 1];
    if (last) {
      bufferRef.current = [
        ...bufferRef.current.slice(0, -1),
        { ...last, ax: acc.x ?? 0, ay: acc.y ?? 0, az: acc.z ?? 0 },
      ];
    }
  }, []);

  useEffect(() => {
    if (!code) {
      setState("error");
      setErrorMsg("No room code provided.");
      return;
    }

    if (!isSecureContext()) {
      setState("unsupported");
      setErrorMsg("Secure context (HTTPS) required for sensor access.");
      return;
    }

    if (!hasDeviceOrientation()) {
      setState("unsupported");
      setErrorMsg("DeviceOrientation API not available on this device.");
      return;
    }

    const ws = new WebSocket(RELAY_URL);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "hello", version: 1, role: "peer", roomCode: code }));
    });

    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "welcome") {
          setState("connected");
          requestWakeLock();
          window.addEventListener("deviceorientation", handleOrientation);
          window.addEventListener("devicemotion", handleMotion);
          batchTimerRef.current = setInterval(flushBatch, BATCH_INTERVAL_MS);
        } else if (msg.type === "error") {
          setState("error");
          setErrorMsg(msg.message ?? "Connection rejected by relay.");
        }
      } catch { /* ignore parse errors */ }
    });

    ws.addEventListener("error", () => {
      setState("error");
      setErrorMsg("Cannot reach relay server.");
    });

    ws.addEventListener("close", () => {
      setState("error");
      setErrorMsg("Disconnected from session.");
    });

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("devicemotion", handleMotion);
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      releaseWakeLock();
      ws.close();
    };
  }, [code, requestWakeLock, releaseWakeLock, handleOrientation, handleMotion, flushBatch]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      textAlign: "center", background: "#0a0a1a",
    }}>
      {state === "connecting" && (
        <div>
          <p style={{ fontSize: 20, marginBottom: 8 }}>Joining session...</p>
          <p style={{ color: "#888", fontSize: 14 }}>Room {code}</p>
        </div>
      )}

      {state === "connected" && (
        <div>
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            border: "2px solid rgba(100,255,140,0.4)",
            boxShadow: "0 0 30px rgba(100,255,140,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24, animation: "breathe 2s ease-in-out infinite",
          }}>
            <svg viewBox="0 0 100 100" width={60} height={60} aria-label="active spirit">
              <ellipse cx={50} cy={45} rx={25} ry={30} fill="rgba(100,255,140,0.3)" />
              <circle cx={40} cy={40} r={4} fill="#aaffcc" />
              <circle cx={60} cy={40} r={4} fill="#aaffcc" />
              <ellipse cx={50} cy={55} rx={8} ry={5} fill="none" stroke="#aaffcc" strokeWidth={1.5} />
            </svg>
          </div>
          <p style={{ fontSize: 20, marginBottom: 8, color: "#aaffcc" }}>Connected</p>
          <p style={{ color: "#888", fontSize: 14, maxWidth: 280 }}>
            Move your phone to control the poltergeist. Keep this screen open.
          </p>
        </div>
      )}

      {state === "error" && (
        <div>
          <p style={{ fontSize: 20, marginBottom: 8, color: "#ff8866" }}>Connection Failed</p>
          <p style={{ color: "#999", fontSize: 14 }}>{errorMsg}</p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 20, padding: "10px 24px", background: "#223355",
            border: "1px solid #446", color: "#ccd", borderRadius: 6, cursor: "pointer",
          }}>Try Again</button>
        </div>
      )}

      {state === "unsupported" && (
        <div>
          <p style={{ fontSize: 20, marginBottom: 8, color: "#ffaa44" }}>Not Supported</p>
          <p style={{ color: "#999", fontSize: 14, maxWidth: 300 }}>{errorMsg}</p>
          <p style={{ color: "#666", fontSize: 12, marginTop: 16 }}>
            Try opening this link on a mobile device with HTTPS.
          </p>
        </div>
      )}

      <style>{`@keyframes breathe { 0%,100% { transform:scale(1); opacity:.8; } 50% { transform:scale(1.08); opacity:1; } }`}</style>
    </main>
  );
}
