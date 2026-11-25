import { useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SpiritTrouble, QrCode, Ghost, playerNeon } from "seance-avatars";
import { useLiveRoom, useLiveBatches } from "../live/LiveRoom.js";
import { ShakeTrigger } from "../live/shake.js";

interface Feature {
  readonly to: string;
  readonly icon: string;
  readonly title: string;
  readonly what: string;
  /** Opens a different app (full page load) instead of an in-app route. */
  readonly external?: boolean;
}

const FEATURES: readonly Feature[] = [
  { to: "/lab", icon: "🧪", title: "Physics Lab", what: "9 experiments with your phone: gravity, free fall, spin… the Oracle checks your result." },
  { to: "/choir/", icon: "🎤", title: "Banshee Choir", what: "Everyone's phone becomes a singing ghost. Pick an instrument, hold to sing, tilt for notes.", external: true },
  { to: "/hear", icon: "🎧", title: "Ghost Ear", what: "Accessible mode: hear sensor data as sound instead of reading charts." },
  { to: "/bench", icon: "📱", title: "WraithBench", what: "Test how good your phone's sensors really are and get a device passport." },
  { to: "/array", icon: "🌌", title: "Spirit Array", what: "Several phones at once, as one big multi-point sensor." },
  { to: "/gate", icon: "📷", title: "Apparition Gate", what: "Turn the laptop camera into a light gate that times things passing by." },
  { to: "/circle", icon: "🕯️", title: "Séance Circle", what: "Classroom board: pool everyone's measurements and compare." },
  { to: "/skeptic", icon: "🔍", title: "Skeptic's Séance", what: "Audit the room for vibration and noise before trusting a measurement." },
  { to: "/replay", icon: "📼", title: "Recorded Haunting", what: "No phone? Watch a recorded session play back." },
];

export function Landing() {
  const room = useLiveRoom();
  const roomCode = room.status === "ready" ? room.code : null;
  const error = room.status === "error" ? room.error : null;
  const [copied, setCopied] = useState(false);
  const [dizzy, setDizzy] = useState(0);
  const [lastShaker, setLastShaker] = useState<string | null>(null);
  const navigate = useNavigate();

  // Shake any connected phone: the ghost gets dizzy (wobbles, spiral eyes, topples; ~3 s).
  const shakeRef = useRef(new ShakeTrigger());
  const playersRef = useRef(room.players);
  playersRef.current = room.players;
  useLiveBatches((peerId, batch) => {
    if (!shakeRef.current.feed(batch)) return;
    const i = playersRef.current.findIndex((p) => p.id === peerId);
    setLastShaker(playersRef.current[i]?.name ?? `Spirit ${i + 1}`);
    setDizzy((n) => n + 1);
  });

  const joinUrl = roomCode ? `${window.location.origin}/join.html?code=${roomCode}` : "";

  const handleCopy = useCallback(async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [joinUrl]);

  const players = room.players;
  const host = players[0];

  return (
    <main className="sx-page" style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginTop: 12 }}>
        <p className="sx-kicker">Séance · Phone-powered physics</p>
        <h1 className="sx-glitch" style={{ fontSize: "clamp(20px, 5vw, 40px)", margin: "12px 0 8px" }}>Poltergeist Lab</h1>
        <p className="sx-muted" style={{ maxWidth: 620, margin: "0 auto", fontSize: 18 }}>
          Scan the code with your phone, type your name, and your phone possesses the ghost. Then measure real physics
          with its sensors, or sing together in the Banshee Choir.
        </p>
      </header>

      {error && !roomCode && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <SpiritTrouble code="relay-unreachable-host" onAction={room.retry} onSecondaryAction={() => navigate("/replay")} />
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          marginTop: 28,
          alignItems: "stretch",
        }}
      >
        <div className="sx-box" style={{ padding: 0, minHeight: 380, position: "relative" }}>
          <Ghost
            height={380}
            color={host ? playerNeon(0) : "#00ffff"}
            name={host?.name}
            dizzy={dizzy}
            label="3D ghost. Drag to spin it; shake a connected phone to make it dizzy."
          />
          <p
            className={players.length > 0 ? "sx-status-live" : "sx-muted"}
            style={{ position: "absolute", left: 12, bottom: 10, fontSize: 14, pointerEvents: "none" }}
          >
            {players.length === 0
              ? "Drag to spin the ghost · connect a phone and shake it 🌀"
              : lastShaker && dizzy > 0
                ? `${lastShaker} made the ghost dizzy! 🌀`
                : "Shake your phone to make the ghost dizzy 🌀"}
          </p>
        </div>

        <div className="sx-box sx-box--pink" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          {!roomCode && !error && <p className="sx-glow-cyan sx-pulse" style={{ fontFamily: "var(--sx-font-pixel)", fontSize: 11, marginTop: 40 }}>OPENING THE SÉANCE…</p>}
          {roomCode && (
            <>
              <p className="sx-muted" style={{ fontSize: 14 }}>1 · Scan with your phone camera</p>
              <div className="sx-qr">
                <QrCode text={joinUrl} size={200} />
              </div>
              <p className="sx-code" style={{ fontSize: 28 }}>{roomCode}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={handleCopy} className="sx-ghost-btn">{copied ? "Copied!" : "Copy link"}</button>
                <button onClick={room.newRoom} className="sx-ghost-btn sx-ghost-btn--pink" title="Forget this room and make a new code">New code</button>
              </div>

              <p className="sx-muted" style={{ fontSize: 14, marginTop: 6 }}>2 · Players in this séance</p>
              {players.length === 0 ? (
                <p className="sx-muted sx-pulse" style={{ fontSize: 15 }}>Waiting for the first spirit…</p>
              ) : (
                <ul aria-label="Players" style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {players.map((p, i) => (
                    <li key={p.id} className="sx-chip" style={{ borderColor: playerNeon(i), color: playerNeon(i), fontSize: 14 }}>
                      👻 {p.name ?? `Spirit ${i + 1} (naming…)`}
                    </li>
                  ))}
                </ul>
              )}

              {players.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
                  <Link to={`/possession/${roomCode}`} className="sx-btn">Enter the possession &rarr;</Link>
                  <a href="/choir/" className="sx-btn sx-btn--cyan">Banshee Choir &rarr;</a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <h2 style={{ fontSize: 18, textAlign: "center", margin: "40px 0 6px" }} className="sx-glow-cyan">Pick your haunting</h2>
      <p className="sx-muted" style={{ textAlign: "center", marginBottom: 18 }}>Your phone stays connected while you switch between these.</p>
      <nav
        aria-label="Features"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}
      >
        {FEATURES.map((f) => {
          const body = (
            <>
              <span style={{ fontSize: 28 }} aria-hidden="true">{f.icon}</span>
              <span style={{ display: "block", fontFamily: "var(--sx-font-display)", fontSize: 16, margin: "8px 0 4px", color: "#fff" }}>{f.title}</span>
              <span className="sx-muted" style={{ fontSize: 15, lineHeight: 1.35 }}>{f.what}</span>
            </>
          );
          return f.external ? (
            <a key={f.to} href={f.to} className="sx-card" style={{ padding: 16 }}>{body}</a>
          ) : (
            <Link key={f.to} to={f.to} className="sx-card" style={{ padding: 16 }}>{body}</Link>
          );
        })}
      </nav>
    </main>
  );
}
