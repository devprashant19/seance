import React, { useState } from "react";
import { logPitchMapping, resultSentence, SpeechSynthesisAnnouncer } from "seance-sonify";

export function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [reading, setReading] = useState("Ready. Press Start to explore by ear.");

  const handleStart = () => {
    setIsPlaying(true);
    const speech = new SpeechSynthesisAnnouncer();
    const sentence = resultSentence({
      label: "Gravitational acceleration g",
      value: 9.807,
      uncertainty: 0.035,
      unit: "m/s^2",
    });
    setReading(sentence);
    speech.speak(sentence);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>👻 Ghost Ear Lab</h1>
      <p style={{ color: "#aaa" }}>Accessible physics measurement through sound and speech.</p>
      <div style={{ margin: "2rem 0", padding: "1.5rem", background: "#111", border: "1px solid #333", borderRadius: 8 }}>
        <p style={{ fontSize: "1.2rem" }}>{reading}</p>
        <button
          onClick={handleStart}
          style={{ padding: "0.75rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: "1rem", cursor: "pointer" }}
        >
          {isPlaying ? "Announce Again" : "Start Hearing Experiment"}
        </button>
      </div>
    </main>
  );
}
