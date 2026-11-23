import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { SpiritTrouble, type SpiritTroubleCode } from "seance-avatars";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";
const BATCH_INTERVAL_MS = 50;

type ConnectionState = "needs-gesture" | "connecting" | "connected" | "error" | "unsupported";

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
  const [state, setState] = useState<ConnectionState>("needs-gesture");
  const [troubleCode, setTroubleCode] = useState<SpiritTroubleCode>("relay-unreachable-phone");
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

  const beginSeance = useCallback(async () => {
    if (!code) {
      setState("error");
      setTroubleCode("room-not-found");
      return;
    }

    if (!isSecureContext()) {
      setState("error");
      setTroubleCode("insecure-context");
      return;
    }

    if (!hasDeviceOrientation()) {
      setState("error");
      setTroubleCode("no-sensors");
      return;
    }

    // iOS permission request in gesture handler
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      try {
        const motionResp = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (motionResp !== "granted") {
          setState("error");
          setTroubleCode("motion-denied");
          return;
        }
      } catch {
        setState("error");
        setTroubleCode("motion-denied");
        return;
      }
    }

    setState("connecting");
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
          if (msg.message?.includes("full")) {
            setTroubleCode("room-full");
          } else {
            setTroubleCode("room-not-found");
          }
        }
      } catch { /* ignore parse errors */ }
    });

    ws.addEventListener("error", () => {
      setState("error");
      setTroubleCode("relay-unreachable-phone");
    });

    ws.addEventListener("close", () => {
      setState("error");
      setTroubleCode("relay-dropped");
    });
  }, [code, requestWakeLock, handleOrientation, handleMotion, flushBatch]);

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("devicemotion", handleMotion);
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      releaseWakeLock();
      wsRef.current?.close();
    };
  }, [releaseWakeLock, handleOrientation, handleMotion]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      textAlign: "center", background: "#0a0a1a",
    }}>
      {state === "needs-gesture" && (
        <div style={{ maxWidth: 320 }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            border: "2px solid rgba(120, 160, 255, 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <span style={{ fontSize: 36 }}>🕯</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: "#f0f4ff", marginBottom: 8 }}>
            Summon Spirit
          </h2>
          <p style={{ color: "#889", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Room <strong style={{ color: "#aaccff" }}>{code}</strong>. Tap below to awaken the vessel and link your phone sensors.
          </p>
          <button
            type="button"
            onClick={beginSeance}
            style={{
              width: "100%", minHeight: 48, padding: "12px 24px",
              background: "#334477", border: "1px solid #5577bb",
              color: "#fff", borderRadius: 8, cursor: "pointer",
              fontSize: 16, fontWeight: 600,
            }}
          >
            Begin the séance
          </button>
        </div>
      )}

      {state === "connecting" && (
        <div>
          <p style={{ fontSize: 20, marginBottom: 8, color: "#d0d8ff" }}>Joining session...</p>
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
        <SpiritTrouble
          code={troubleCode}
          onAction={beginSeance}
          onSecondaryAction={() => { window.location.href = "/replay"; }}
        />
      )}

      {state === "unsupported" && (
        <SpiritTrouble
          code="no-sensors"
          onAction={() => window.location.reload()}
          onSecondaryAction={() => { window.location.href = "/replay"; }}
        />
      )}

      <style>{`@keyframes breathe { 0%,100% { transform:scale(1); opacity:.8; } 50% { transform:scale(1.08); opacity:1; } }`}</style>
    </main>
  );
}
