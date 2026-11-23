import { useState, useCallback, useEffect } from "react";
import { Stage } from "../stage/index.js";
import type { ScaleName } from "../audio/index.js";

const NOTE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];

export function ChoirHome() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [scaleName, setScaleName] = useState<ScaleName>("graveyard");
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [droneMode, setDroneMode] = useState(false);
  const [singing, setSinging] = useState(false);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const handleUnlock = useCallback(() => {
    setAudioUnlocked(true);
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setSinging(true);
      }
      if (NOTE_KEYS.includes(e.key)) {
        setActiveNote(e.key);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") {
        setSinging(false);
      }
      if (e.key === activeNote) {
        setActiveNote(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [audioUnlocked, activeNote]);

  const demoSingers = audioUnlocked
    ? [{
        id: "keyboard",
        name: "You (keyboard)",
        amplitude: singing ? 0.7 : 0,
        muted: false,
        solo: false,
      }]
    : [];

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", padding: 16,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: 2, marginBottom: 8 }}>
        Banshee Choir
      </h1>
      <p style={{ color: "#778", marginBottom: 24, textAlign: "center", maxWidth: 480 }}>
        A multi-phone synthesized choir. Connect phones to sing together, or use the keyboard below.
      </p>

      <Stage
        singers={demoSingers}
        scaleName={scaleName}
        masterVolume={masterVolume}
        droneMode={droneMode}
        audioUnlocked={audioUnlocked}
        onScaleChange={setScaleName}
        onVolumeChange={setMasterVolume}
        onDroneModeChange={setDroneMode}
        onMuteSinger={() => {}}
        onSoloSinger={() => {}}
        onUnlockAudio={handleUnlock}
      />

      {audioUnlocked && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#667", marginBottom: 8 }}>
            Hold <kbd style={kbdStyle}>Space</kbd> to sing.
            Press <kbd style={kbdStyle}>A</kbd>–<kbd style={kbdStyle}>K</kbd> to change note.
          </p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {NOTE_KEYS.map((k) => (
              <div
                key={k}
                style={{
                  width: 40, height: 48, borderRadius: 4,
                  border: `1px solid ${activeNote === k ? "#6688ff" : "#334"}`,
                  background: activeNote === k ? "#223355" : "#111122",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: activeNote === k ? "#aaccff" : "#556",
                  fontSize: 14, fontFamily: "monospace", textTransform: "uppercase",
                }}
              >
                {k}
              </div>
            ))}
          </div>
        </div>
      )}

      <a href="/replay" style={{ marginTop: 32, color: "#556", fontSize: 13, textDecoration: "none" }}>
        Hear a recorded s&eacute;ance &rarr;
      </a>
    </main>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: "2px 6px", background: "#223", border: "1px solid #445",
  borderRadius: 3, fontFamily: "monospace", fontSize: 11,
};
