import { useState, useEffect, useCallback } from "react";
import { SpiritTrouble } from "seance-avatars";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";
const RETRY_DELAY_MS = 5000;

function encodeToMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false) as boolean[]);
  for (let i = 0; i < text.length && i < size * size; i++) {
    const code = text.charCodeAt(i);
    for (let b = 0; b < 8 && i * 8 + b < size * size; b++) {
      const idx = i * 8 + b;
      const r = Math.floor(idx / size);
      const c = idx % size;
      if (r < size && c < size) {
        matrix[r]![c] = Boolean((code >> (7 - b)) & 1);
      }
    }
  }
  for (const [row, col] of [[0, 0], [0, size - 7], [size - 7, 0]] as const) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (row + r < size && col + c < size) {
          matrix[row + r]![col + c] = isEdge || isInner;
        }
      }
    }
  }
  return matrix;
}

function QrCode({ text, size }: { text: string; size: number }) {
  const cells = encodeToMatrix(text);
  const n = cells.length;
  const cellSize = size / n;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`QR code for ${text}`}>
      {cells.flatMap((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#fff" /> : null,
        ),
      )}
    </svg>
  );
}

export function Landing() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState(0);
  const [copied, setCopied] = useState(false);

  const connectRelay = useCallback(() => {
    setError(null);
    try {
      const ws = new WebSocket(RELAY_URL);
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ type: "hello", version: 1, role: "host" }));
      });
      ws.addEventListener("message", (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "welcome" && msg.roomCode) {
            setRoomCode(msg.roomCode as string);
          }
        } catch { /* ignore */ }
      });
      ws.addEventListener("error", () => {
        setError("Cannot reach relay server.");
        setRetryIn(RETRY_DELAY_MS / 1000);
      });
    } catch {
      setError("Cannot reach relay server.");
      setRetryIn(RETRY_DELAY_MS / 1000);
    }
  }, []);

  useEffect(() => { connectRelay(); }, [connectRelay]);

  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setInterval(() => {
      setRetryIn((prev) => {
        if (prev <= 1) { connectRelay(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [retryIn, connectRelay]);

  const joinUrl = roomCode ? `${window.location.origin}/join/${roomCode}` : "";

  const handleCopy = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [joinUrl]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      textAlign: "center", background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
    }}>
      <div aria-hidden="true" style={{
        width: 200, height: 200, borderRadius: "50%",
        border: "2px solid rgba(100,140,255,0.3)",
        boxShadow: "0 0 40px rgba(100,140,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32, animation: "pulse 3s ease-in-out infinite",
      }}>
        <svg viewBox="0 0 100 100" width={120} height={120}>
          <circle cx={50} cy={50} r={45} fill="none" stroke="rgba(100,140,255,0.4)" strokeWidth={1} />
          <circle cx={50} cy={50} r={30} fill="none" stroke="rgba(100,140,255,0.3)" strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={50} y={55} textAnchor="middle" fill="rgba(200,220,255,0.6)" fontSize={8} fontFamily="serif">summon</text>
        </svg>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 8, letterSpacing: 2 }}>Poltergeist Lab</h1>
      <p style={{ color: "#888", marginBottom: 32, maxWidth: 400 }}>Scan the code with your phone to begin the haunting.</p>

      {error && !roomCode && (
        <SpiritTrouble
          code="relay-unreachable-host"
          onAction={connectRelay}
          onSecondaryAction={() => { window.location.href = "/replay"; }}
        />
      )}

      {roomCode && (
        <>
          <div style={{ marginBottom: 16 }}>
            <QrCode text={joinUrl} size={280} />
          </div>
          <p style={{ fontSize: 48, fontFamily: "monospace", letterSpacing: 8, marginBottom: 12, color: "#aabbff" }}>
            {roomCode}
          </p>
          <button onClick={handleCopy} style={{
            padding: "8px 24px", background: copied ? "#334466" : "#223355",
            border: "1px solid #446", color: "#ccd", borderRadius: 6, cursor: "pointer", fontSize: 14,
          }}>{copied ? "Copied!" : "Copy Link"}</button>
        </>
      )}

      <a
        href="/replay"
        style={{
          marginTop: 32,
          color: "#99aabb",
          fontSize: 14,
          textDecoration: "underline",
          padding: "8px 16px",
          display: "inline-block",
        }}
      >
        No phone? Watch a recorded haunting &rarr;
      </a>

      <style>{`@keyframes pulse { 0%,100% { opacity:.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }`}</style>
    </main>
  );
}
