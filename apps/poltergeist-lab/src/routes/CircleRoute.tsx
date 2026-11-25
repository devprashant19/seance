import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  computeClassStats,
  generateCircleCsv,
  generateCircleNotebook,
  type TeamResult,
  type ClassStatistics,
} from "seance-core";

const DEFAULT_TEAMS: TeamResult[] = [
  { teamId: "team-1", teamName: "Team Banshee", station: "Station 1", value: 9.814, uncertainty: 0.035, timestamp: Date.now() - 600000, notes: "Clean small-angle swing" },
  { teamId: "team-2", teamName: "Team Wraith", station: "Station 2", value: 9.792, uncertainty: 0.042, timestamp: Date.now() - 500000, notes: "10 oscillations" },
  { teamId: "team-3", teamName: "Team Specter", station: "Station 3", value: 9.825, uncertainty: 0.028, timestamp: Date.now() - 400000, notes: "Fine calibration" },
  { teamId: "team-4", teamName: "Team Phantom", station: "Station 4", value: 9.805, uncertainty: 0.038, timestamp: Date.now() - 300000, notes: "String clamped firmly" },
  { teamId: "team-5", teamName: "Team Poltergeist", station: "Station 5", value: 9.831, uncertainty: 0.045, timestamp: Date.now() - 200000, notes: "3 trials averaged" },
  { teamId: "team-6", teamName: "Team Shadow", station: "Station 6", value: 10.450, uncertainty: 0.060, timestamp: Date.now() - 100000, notes: "Large swing angle (anomaly)" },
];

export function CircleRoute(): React.ReactElement {
  const [experiment, setExperiment] = useState<string>("pendulum-g");
  const [unit, setUnit] = useState<string>("m/s^2");
  const [results, setResults] = useState<TeamResult[]>(DEFAULT_TEAMS);

  // New team entry form
  const [newTeam, setNewTeam] = useState<string>("");
  const [newVal, setNewVal] = useState<string>("");
  const [newUnc, setNewUnc] = useState<string>("");

  const stats: ClassStatistics = computeClassStats(results);

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newVal);
    const unc = parseFloat(newUnc);
    if (!newTeam || isNaN(val) || isNaN(unc) || unc <= 0) return;

    const entry: TeamResult = {
      teamId: `team-${Date.now()}`,
      teamName: newTeam,
      station: `Station ${results.length + 1}`,
      value: val,
      uncertainty: unc,
      timestamp: Date.now(),
    };

    setResults([...results, entry]);
    setNewTeam("");
    setNewVal("");
    setNewUnc("");
  };

  const downloadCsv = () => {
    const csv = generateCircleCsv(results, experiment, unit);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seance-circle-${experiment}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadNotebook = () => {
    const nb = generateCircleNotebook(results, experiment, unit);
    const blob = new Blob([nb], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seance-circle-${experiment}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dot plot scaling
  const minVal = Math.min(...results.map((r) => r.value - r.uncertainty), stats.weightedMean - 0.2);
  const maxVal = Math.max(...results.map((r) => r.value + r.uncertainty), stats.weightedMean + 0.2);
  const valRange = Math.max(0.1, maxVal - minVal);

  const svgWidth = 700;
  const svgHeight = 220;
  const padding = 50;

  const getY = (val: number) => {
    const normalized = (val - minVal) / valRange;
    return svgHeight - padding - normalized * (svgHeight - 2 * padding);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", color: "#eee8ff", fontFamily: "monospace" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "#00e5ff", textDecoration: "none" }}>&larr; Back to Lab</Link>
        <h1 style={{ fontSize: "1.8rem", margin: "0.5rem 0 0.25rem", color: "#f5f0ff" }}>
          Séance Circle: Classroom Board
        </h1>
        <p style={{ color: "#b4a9d6", margin: 0 }}>
          Collaborative multi-team lab synthesis with uncertainty weighting & non-censored outlier detection
        </p>
      </header>

      {/* Control bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem", background: "#140726", padding: "1rem", borderRadius: 8, border: "1px solid #3d2466" }}>
        <div>
          <label style={{ fontSize: "0.85rem", color: "#b4a9d6", display: "block" }}>Experiment</label>
          <select
            value={experiment}
            onChange={(e) => {
              setExperiment(e.target.value);
              if (e.target.value === "singing-ruler") setUnit("GPa");
              else if (e.target.value === "gate-period") setUnit("s");
              else setUnit("m/s^2");
            }}
            style={{ background: "#0e0420", color: "#fff", border: "1px solid #3d2466", padding: "0.4rem 0.8rem", borderRadius: 6 }}
          >
            <option value="pendulum-g">The Swinging Spirit (pendulum g)</option>
            <option value="free-fall">Free Fall (gravitational acceleration)</option>
            <option value="singing-ruler">The Singing Ruler (Young's modulus)</option>
            <option value="gate-period">Apparition Gate (pendulum period)</option>
          </select>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button
            onClick={downloadCsv}
            style={{ background: "#1f0a35", color: "#00e5ff", border: "1px solid #3d2466", padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}
          >
            Export CSV
          </button>
          <button
            onClick={downloadNotebook}
            style={{ background: "#1f0a35", color: "#00ff99", border: "1px solid #3d2466", padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}
          >
            Export Jupyter Notebook (.ipynb)
          </button>
        </div>
      </div>

      {/* Statistical Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8, border: "1px solid #3d2466" }}>
          <span style={{ fontSize: "0.8rem", color: "#b4a9d6" }}>Sample Mean</span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f5f0ff", margin: "0.25rem 0" }}>
            {stats.mean.toFixed(3)} ± {stats.sampleStdDev.toFixed(3)} {unit}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>N = {stats.count} teams</span>
        </div>

        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8, border: "1px solid #3d2466" }}>
          <span style={{ fontSize: "0.8rem", color: "#b4a9d6" }}>Median & MAD</span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#00e5ff", margin: "0.25rem 0" }}>
            {stats.median.toFixed(3)} {unit}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>MAD = {stats.mad.toFixed(3)} {unit}</span>
        </div>

        <div style={{ background: "#140726", padding: "1rem", borderRadius: 8, border: "1px solid #00b377" }}>
          <span style={{ fontSize: "0.8rem", color: "#00ff99" }}>Weighted Consensus (1/σ²)</span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#00ff99", margin: "0.25rem 0" }}>
            {stats.weightedMean.toFixed(3)} ± {stats.weightedUncertainty.toFixed(3)} {unit}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#b4a9d6" }}>Inverse-variance weighted</span>
        </div>
      </div>

      {/* Dot plot with Error Bars */}
      <div style={{ background: "#140726", border: "1px solid #3d2466", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "#f5f0ff" }}>
          Classroom Distribution & Uncertainty Bars
        </h2>

        <div style={{ overflowX: "auto" }}>
          <svg width={svgWidth} height={svgHeight} style={{ background: "#0e0420", borderRadius: 6, display: "block" }}>
            {/* Grid & Reference lines */}
            <line x1={padding} y1={getY(stats.weightedMean)} x2={svgWidth - padding} y2={getY(stats.weightedMean)} stroke="#00ff99" strokeWidth={2} />
            <line x1={padding} y1={getY(stats.mean)} x2={svgWidth - padding} y2={getY(stats.mean)} stroke="#ff3b8d" strokeWidth={1} strokeDasharray="4 4" />

            {/* Error bars and points */}
            {results.map((r, i) => {
              const xStep = (svgWidth - 2 * padding) / Math.max(1, results.length - 1);
              const x = padding + i * xStep;
              const y = getY(r.value);
              const yTop = getY(r.value + r.uncertainty);
              const yBot = getY(r.value - r.uncertainty);
              const isOutlier = stats.outlierTeamIds.includes(r.teamId);

              return (
                <g key={r.teamId}>
                  {/* Whisker */}
                  <line x1={x} y1={yTop} x2={x} y2={yBot} stroke={isOutlier ? "#ffe066" : "#00e5ff"} strokeWidth={2} />
                  <line x1={x - 4} y1={yTop} x2={x + 4} y2={yTop} stroke={isOutlier ? "#ffe066" : "#00e5ff"} strokeWidth={2} />
                  <line x1={x - 4} y1={yBot} x2={x + 4} y2={yBot} stroke={isOutlier ? "#ffe066" : "#00e5ff"} strokeWidth={2} />
                  {/* Point */}
                  <circle cx={x} cy={y} r={5} fill={isOutlier ? "#ffe066" : "#00e5ff"} />
                  {/* Label */}
                  <text x={x} y={svgHeight - 15} textAnchor="middle" fontSize={10} fill="#b4a9d6">
                    {r.teamName.replace("Team ", "")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.8rem", color: "#b4a9d6" }}>
          <span><span style={{ color: "#00ff99" }}>—</span> Weighted Mean ({stats.weightedMean.toFixed(3)})</span>
          <span><span style={{ color: "#ff3b8d" }}>---</span> Sample Mean ({stats.mean.toFixed(3)})</span>
          <span><span style={{ color: "#ffe066" }}>●</span> Anomaly Outlier (|x - med| &gt; 3·MAD)</span>
        </div>
      </div>

      {/* Team Entries Table */}
      <div style={{ background: "#140726", border: "1px solid #3d2466", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "#f5f0ff" }}>
          Team Measurements
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {results.map((r) => {
            const isOutlier = stats.outlierTeamIds.includes(r.teamId);
            return (
              <div
                key={r.teamId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: isOutlier ? "rgba(210, 153, 34, 0.1)" : "#0e0420",
                  border: isOutlier ? "1px solid #ffe066" : "1px solid #3d2466",
                  borderRadius: 6,
                }}
              >
                <div>
                  <strong>{r.teamName}</strong>
                  <span style={{ color: "#b4a9d6", fontSize: "0.85rem", marginLeft: "0.5rem" }}>({r.station})</span>
                  {r.notes && <div style={{ fontSize: "0.8rem", color: "#b4a9d6", marginTop: 2 }}>{r.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold", color: isOutlier ? "#ff7a00" : "#00e5ff" }}>
                    {r.value.toFixed(3)} ± {r.uncertainty.toFixed(3)} {unit}
                  </div>
                  {isOutlier && (
                    <span style={{ fontSize: "0.75rem", color: "#ff7a00", fontWeight: "bold" }}>
                      ⚠️ Outlier Flag (|x - median| &gt; 3·MAD)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Team Measurement Form */}
        <form onSubmit={handleAddResult} style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Team Name"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            style={{ flex: 1, minWidth: 150, background: "#0e0420", border: "1px solid #3d2466", color: "#fff", padding: "0.5rem", borderRadius: 6 }}
          />
          <input
            type="number"
            step="any"
            placeholder={`Value (${unit})`}
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            style={{ width: 140, background: "#0e0420", border: "1px solid #3d2466", color: "#fff", padding: "0.5rem", borderRadius: 6 }}
          />
          <input
            type="number"
            step="any"
            placeholder={`Uncertainty (${unit})`}
            value={newUnc}
            onChange={(e) => setNewUnc(e.target.value)}
            style={{ width: 150, background: "#0e0420", border: "1px solid #3d2466", color: "#fff", padding: "0.5rem", borderRadius: 6 }}
          />
          <button
            type="submit"
            style={{ background: "#00b377", color: "#fff", border: "none", padding: "0.5rem 1.25rem", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            + Add Team Run
          </button>
        </form>
      </div>
    </div>
  );
}
