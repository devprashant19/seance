import { useState } from "react";

export function App() {
  const [started, setStarted] = useState(false);
  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 16, fontFamily: "system-ui", color: "#ccd" }}>
      <h1 style={{ fontSize: 24, fontWeight: 300 }}>{"{{name}}"}</h1>
      <p style={{ color: "#889" }}>A Séance-powered physics lab.</p>
      {!started ? (
        <button
          onClick={() => setStarted(true)}
          style={{ padding: "12px 24px", background: "#223355", border: "1px solid #446", color: "#ccd", borderRadius: 6, cursor: "pointer", marginTop: 16 }}
        >
          Begin Experiment
        </button>
      ) : (
        <p style={{ marginTop: 16 }}>Experiment running… (connect a phone or use a bundled trace)</p>
      )}
    </div>
  );
}
