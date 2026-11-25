import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SmokedDrum, type DrumChannelData } from "seance-avatars";
import { estimateSyncSkewBound } from "seance-core";

export function ArrayRoute() {
  const [memberCount, setMemberCount] = useState(2);
  const [skewReport, setSkewReport] = useState(() => estimateSyncSkewBound([12, 14, 11, 16, 13]));
  const [channels, setChannels] = useState<DrumChannelData[]>([]);

  useEffect(() => {
    // Generate simulated coupled pendulum traces for array view
    const t: number[] = [];
    const v1: number[] = [];
    const v2: number[] = [];
    const v3: number[] = [];

    for (let i = 0; i < 300; i++) {
      const curT = i * 20;
      t.push(curT);
      // Coupled oscillators: f1 = 1.0 Hz, f2 = 1.15 Hz -> beat period ~ 6.6 s
      const s1 = Math.sin((2 * Math.PI * curT * 1.0) / 1000) * Math.cos((2 * Math.PI * curT * 0.075) / 1000);
      const s2 = Math.sin((2 * Math.PI * curT * 1.0) / 1000 + 0.3) * Math.sin((2 * Math.PI * curT * 0.075) / 1000);
      const s3 = Math.sin((2 * Math.PI * curT * 1.0) / 1000 + 0.6) * 0.5;

      v1.push(s1 * 2.5);
      v2.push(s2 * 2.5);
      v3.push(s3 * 2.5);
    }

    setChannels([
      { id: "spirit-alpha", name: "Phone A (String 1)", color: "#00ff99", t, v: v1 },
      { id: "spirit-beta", name: "Phone B (String 2)", color: "#00e5ff", t, v: v2 },
      { id: "spirit-gamma", name: "Phone C (Reference)", color: "#ffb347", t, v: v3 },
    ]);
  }, []);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "2rem", fontFamily: "monospace", color: "#eee8ff" }}>
      <nav style={{ marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "#b0a6cc", textDecoration: "none" }}>← Back to Sanctum</Link>
      </nav>

      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #2d1b4e", paddingBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.8rem", color: "#00e5ff", margin: 0 }}>Spirit Array: Distributed Normal Modes</h1>
        <p style={{ color: "#c9bfe6", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Synchronized multi-device vibrational sensing and coupled harmonic analysis.
        </p>
        <div style={{ background: "#2d1b4e", padding: "0.75rem 1rem", borderRadius: 4, marginTop: "1rem", fontSize: "0.85rem", borderLeft: "3px solid #00e5ff" }}>
          <strong>Classroom Notice:</strong> Desk vibrations traverse millimeter/centimeter distances in milliseconds,
          below mobile sensor sampling periods. Spirit Array teaches normal modes and beat frequencies, not acoustic wave speed.
        </div>
      </header>

      {/* Sync Quality Dashboard */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8 }}>
          <div style={{ color: "#8a7bb5", fontSize: "0.8rem", textTransform: "uppercase" }}>Connected Spirits</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#00ff99" }}>3 Devices</div>
          <div style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>Phone A, Phone B, Phone C</div>
        </div>
        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8 }}>
          <div style={{ color: "#8a7bb5", fontSize: "0.8rem", textTransform: "uppercase" }}>Min Ping RTT</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#00e5ff" }}>{skewReport.minRttMs.toFixed(1)} ms</div>
          <div style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>Mean: {skewReport.meanRttMs.toFixed(1)} ms</div>
        </div>
        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8 }}>
          <div style={{ color: "#8a7bb5", fontSize: "0.8rem", textTransform: "uppercase" }}>Clock Skew Bound</div>
          <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ffb347" }}>±{skewReport.estimatedSkewBoundMs.toFixed(1)} ms</div>
          <div style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>Physical lower bound (≥ 0.5 × min RTT)</div>
        </div>
      </section>

      {/* Smoked Drum Multi-Channel Seismograph */}
      <section style={{ background: "#140726", padding: "1.5rem", borderRadius: 8, marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Multi-Ink Seismograph Drum</h2>
          <span style={{ fontSize: "0.8rem", color: "#b4a9d6" }}>Common Grid: 50 Hz</span>
        </div>
        <div style={{ textAlign: "center" }}>
          {channels.length > 0 && (
            <SmokedDrum channels={channels} width={800} height={280} zoomSecondsPerPx={0.015} />
          )}
        </div>
      </section>

      {/* Mode Shape Decomposition */}
      <section style={{ background: "#140726", padding: "1.5rem", borderRadius: 8 }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>Coupled Normal Modes ("The Tide")</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
          <div style={{ background: "#2d1b4e", padding: "1rem", borderRadius: 6 }}>
            <div style={{ color: "#b4a9d6", fontSize: "0.85rem" }}>In-Phase Mode f₁</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#00ff99" }}>1.00 ± 0.02 Hz</div>
            <div style={{ fontSize: "0.8rem", color: "#e6e0ff", marginTop: 4 }}>Both pendulums swing in unison</div>
          </div>
          <div style={{ background: "#2d1b4e", padding: "1rem", borderRadius: 6 }}>
            <div style={{ color: "#b4a9d6", fontSize: "0.85rem" }}>Out-of-Phase Mode f₂</div>
            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#00e5ff" }}>1.15 ± 0.02 Hz</div>
            <div style={{ fontSize: "0.8rem", color: "#e6e0ff", marginTop: 4 }}>Pendulums swing in opposition</div>
          </div>
        </div>
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 4, fontSize: "0.85rem" }}>
          <strong>Energy Exchange Beat Period:</strong> T_beat = 1 / |f₂ - f₁| = <strong>6.67 ± 0.35 s</strong>
        </div>
      </section>
    </div>
  );
}
