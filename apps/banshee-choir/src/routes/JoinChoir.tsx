import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";
const BATCH_INTERVAL_MS = 50;

export function JoinChoir() {
  const { code } = useParams<{ code: string }>();
  const [connected, setConnected] = useState(false);
  const [singing, setSinging] = useState(false);
  const [pitchNote, setPitchNote] = useState("--");
  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!code) return;
    const ws = new WebSocket(RELAY_URL);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "hello", version: 1, role: "peer", roomCode: code, mode: "choir" }));
    });

    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "welcome") setConnected(true);
      } catch { /* ignore */ }
    });

    ws.addEventListener("close", () => setConnected(false));

    return () => { ws.close(); };
  }, [code]);

  useEffect(() => {
    async function acquireWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch { /* unavailable */ }
    }
    acquireWakeLock();
    return () => { wakeLockRef.current?.release(); };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setSinging(true);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      ws.send(JSON.stringify({ type: "control", touch: { x, y, down: true } }));
    }
    if ("vibrate" in navigator) navigator.vibrate(10);
  }, []);

  const handlePointerUp = useCallback(() => {
    setSinging(false);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "control", touch: { x: 0, y: 0, down: false } }));
    }
  }, []);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
      touchAction: "none", userSelect: "none",
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 300, marginBottom: 8, letterSpacing: 1 }}>
        Banshee Choir
      </h2>

      {!connected && (
        <p style={{ color: "#889", marginBottom: 16 }}>Connecting to room {code}...</p>
      )}

      {connected && (
        <>
          <p style={{ color: "#667", fontSize: 12, marginBottom: 16 }}>
            Touch and hold to sing. Tilt to change pitch.
          </p>

          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: "min(80vw, 320px)", height: "min(60vh, 400px)",
              borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              background: singing
                ? "radial-gradient(circle, #334488 0%, #1a1a3a 70%)"
                : "radial-gradient(circle, #1a1a2e 0%, #111122 70%)",
              border: `2px solid ${singing ? "#5577cc" : "#223"}`,
              transition: "background 0.15s, border-color 0.15s",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 48, opacity: singing ? 1 : 0.3, transition: "opacity 0.15s" }}>
              {singing ? "~" : "o"}
            </span>
          </div>

          <p style={{ marginTop: 12, fontSize: 24, fontFamily: "monospace", color: "#aabbff" }}>
            {pitchNote}
          </p>
        </>
      )}
    </main>
  );
}
