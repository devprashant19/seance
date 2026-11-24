import React, { useState } from "react";
import { analyzeModalFrequencies, evaluateSyncQuality } from "seance-core";

export function App() {
  const [modalResult, setModalResult] = useState<string>("Array ready. Connect 2+ phones.");

  const runAnalysis = () => {
    const fs = 50;
    const n = 100;
    const sig1 = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 1.5 * i) / fs));
    const sig2 = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 1.5 * i) / fs + 0.3));

    const modal = analyzeModalFrequencies([
      { id: "phone-A", values: sig1, fs },
      { id: "phone-B", values: sig2, fs },
    ]);

    setModalResult(`Shared Peak: ${modal.sharedPeakFrequencyHz.toFixed(2)} Hz ± ${modal.phaseUncertaintyDeg.toFixed(1)}° phase uncertainty`);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: 720, margin: "0 auto", fontFamily: "monospace" }}>
      <h1>🌌 Spirit Array</h1>
      <p style={{ color: "#8b949e" }}>Multi-phone synchronous modal frequency analysis.</p>
      <div style={{ margin: "2rem 0", padding: "1.5rem", background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }}>
        <p style={{ fontSize: "1.1rem", color: "#58a6ff" }}>{modalResult}</p>
        <button
          onClick={runAnalysis}
          style={{ padding: "0.6rem 1.2rem", background: "#238636", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
        >
          Analyze Resonant Modes
        </button>
      </div>
    </main>
  );
}
