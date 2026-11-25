import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SpiritTrouble, QrCode } from "seance-avatars";
import { useLiveRoom } from "../live/LiveRoom.js";

export function Landing() {
  const room = useLiveRoom();
  const roomCode = room.status === "ready" ? room.code : null;
  const error = room.status === "error" ? room.error : null;
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // A phone that joins while this page is open takes the laptop to the possession view. Phones that
  // were already in the room (coming back from another page) don't — the "go to ghost" link does.
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    if (room.code && room.lastJoinAt > mountedAt.current) navigate(`/possession/${room.code}`);
  }, [room.lastJoinAt, room.code, navigate]);

  const joinUrl = roomCode ? `${window.location.origin}/join.html?code=${roomCode}` : "";

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

      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 4, letterSpacing: 2 }}>Poltergeist Lab</h1>
      <p style={{ color: "#7799cc", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>
        Séance: Ghost Ear Lab
      </p>
      <p style={{ color: "#888", marginBottom: 32, maxWidth: 400 }}>Scan the code with your phone to begin the haunting.</p>

      {error && !roomCode && (
        <SpiritTrouble
          code="relay-unreachable-host"
          onAction={room.retry}
          onSecondaryAction={() => navigate("/replay")}
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
          {room.phones.length > 0 && (
            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ color: "#8f8", fontSize: 14, alignSelf: "center" }}>
                {room.phones.length === 1 ? "1 phone connected" : `${room.phones.length} phones connected`}
              </span>
              <Link to={`/possession/${roomCode}`} style={pillStyle("#aabbff", "#446")}>Go to the ghost &rarr;</Link>
              <a href="/choir/" style={pillStyle("#f9a8d4", "#702459")}>Banshee Choir &rarr;</a>
            </div>
          )}
          <button onClick={room.newRoom} style={{
            marginTop: 12, background: "none", border: "none", color: "#667", cursor: "pointer", fontSize: 12, textDecoration: "underline",
          }}>Start a new séance (new code)</button>
        </>
      )}

      <div style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to="/hear"
          style={{
            color: "#88bbff",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #335588",
            borderRadius: 6,
            background: "rgba(50,100,200,0.1)",
          }}
        >
          🎧 Ghost Ear (accessible mode) &rarr;
        </Link>
        <Link
          to="/bench"
          style={{
            color: "#ecc94b",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #744210",
            borderRadius: 6,
            background: "rgba(200,150,50,0.1)",
          }}
        >
          📱 WraithBench (device passport) &rarr;
        </Link>
        <Link
          to="/array"
          style={{
            color: "#63b3ed",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #2b6cb0",
            borderRadius: 6,
            background: "rgba(40,100,200,0.1)",
          }}
        >
          🌌 Spirit Array (multi-device) &rarr;
        </Link>
        <Link
          to="/gate"
          style={{
            color: "#68d391",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #276749",
            borderRadius: 6,
            background: "rgba(56,161,105,0.1)",
          }}
        >
          📷 Apparition Gate (camera photogate) &rarr;
        </Link>
        <Link
          to="/circle"
          style={{
            color: "#b794f4",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #553c9a",
            borderRadius: 6,
            background: "rgba(128,90,213,0.1)",
          }}
        >
          🕯️ Séance Circle (classroom board) &rarr;
        </Link>
        <Link
          to="/skeptic"
          style={{
            color: "#f6ad55",
            fontSize: 14,
            textDecoration: "none",
            padding: "8px 16px",
            border: "1px solid #9c4221",
            borderRadius: 6,
            background: "rgba(221,107,32,0.1)",
          }}
        >
          🔍 Skeptic's Séance (environmental audit) &rarr;
        </Link>
        <Link
          to="/replay"
          style={{
            color: "#99aabb",
            fontSize: 14,
            textDecoration: "underline",
            padding: "8px 16px",
            display: "inline-block",
          }}
        >
          No phone? Watch a recorded haunting &rarr;
        </Link>
      </div>

      {room.status === "connecting" && !roomCode && <p style={{ color: "#667" }}>Opening the séance…</p>}

      <style>{`@keyframes pulse { 0%,100% { opacity:.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }`}</style>
    </main>
  );
}

function pillStyle(color: string, border: string): CSSProperties {
  return {
    color, fontSize: 14, textDecoration: "none", padding: "8px 16px",
    border: `1px solid ${border}`, borderRadius: 6, background: "rgba(255,255,255,0.04)",
  };
}
