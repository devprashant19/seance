import { useState, useEffect, useCallback } from "react";
import { ExperimentRunner } from "../lab/ExperimentRunner.js";
import { getExperimentById } from "../lab/registry.js";

interface TraceManifestEntry {
  id: string;
  file: string;
  experiment: string;
  device: string;
  label: string;
  cursed?: boolean;
}

interface TraceManifest {
  version: number;
  traces: TraceManifestEntry[];
}

type PlayState = "loading" | "ready" | "playing" | "paused" | "done" | "error";

export function ReplayController({ traceId }: { traceId?: string }) {
  const [manifest, setManifest] = useState<TraceManifest | null>(null);
  const [selectedId, setSelectedId] = useState(traceId ?? "");
  const [playState, setPlayState] = useState<PlayState>("loading");
  const [speed, setSpeed] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [traceData, setTraceData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/traces/bundled.json")
      .then((r) => r.json())
      .then((data: TraceManifest) => {
        setManifest(data);
        if (!selectedId && data.traces.length > 0) {
          setSelectedId(data.traces[0]!.id);
        }
        setPlayState("ready");
      })
      .catch(() => {
        setErrorMsg("Could not load trace manifest.");
        setPlayState("error");
      });
  }, [selectedId]);

  const loadTrace = useCallback(async (id: string) => {
    setPlayState("loading");
    try {
      const res = await fetch(`/traces/${id}.seance`);
      if (!res.ok) throw new Error(`Trace not found: ${id}`);
      const data = await res.json();
      setTraceData(data as Record<string, unknown>);
      setPlayState("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load trace.");
      setPlayState("error");
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadTrace(selectedId);
    }
  }, [selectedId, loadTrace]);

  const selectedEntry = manifest?.traces.find((t) => t.id === selectedId);
  const experiment = selectedEntry ? getExperimentById(selectedEntry.experiment) : undefined;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "4px 12px", background: "rgba(100,140,255,0.1)",
        borderRadius: 20, marginBottom: 16, fontSize: 12, color: "#889",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6688ff", opacity: 0.6 }} />
        Recorded {selectedEntry?.device ?? "device"} · Replay
      </div>

      {playState === "loading" && <p style={{ color: "#889" }}>Loading trace...</p>}

      {playState === "error" && (
        <div>
          <p style={{ color: "#f66", marginBottom: 8 }}>{errorMsg}</p>
          <button onClick={() => selectedId && loadTrace(selectedId)} style={btnStyle}>Retry</button>
        </div>
      )}

      {manifest && (playState === "ready" || playState === "playing" || playState === "paused" || playState === "done") && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#667", marginBottom: 4, display: "block" }}>Trace</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{
                padding: "6px 10px", background: "#1a1a2e", border: "1px solid #334",
                borderRadius: 4, color: "#ddd", fontSize: 13, width: "100%",
              }}
            >
              {manifest.traces.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} {t.cursed ? "(cursed)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setPlayState(playState === "playing" ? "paused" : "playing")}
              style={btnStyle}
            >
              {playState === "playing" ? "Pause" : "Play"}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ ...btnStyle, minWidth: 60 }}
            >
              <option value={1}>1×</option>
              <option value={4}>4×</option>
            </select>
            <button onClick={() => setPlayState("done")} style={btnStyle}>Skip to Verdict</button>
          </div>

          {experiment && traceData && <ExperimentRunner experiment={experiment} />}
        </>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 16px", background: "#1a1a2e", border: "1px solid #334",
  color: "#aab", borderRadius: 4, cursor: "pointer", fontSize: 12,
};
