import { useCallback } from "react";
import type { Verdict } from "../oracle/types.js";

interface ChannelData {
  readonly name: string;
  readonly unit: string;
  readonly samples: readonly { t: number; v: readonly number[] }[];
}

interface ExportMenuProps {
  readonly experimentId: string;
  readonly channels: readonly ChannelData[];
  readonly verdict: Verdict | null;
  readonly inputs: Record<string, number>;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildRawCsv(channels: readonly ChannelData[]): string {
  if (channels.length === 0) return "";

  const headers = ["t_ms"];
  const axisLabels: string[] = [];
  for (const ch of channels) {
    if (ch.samples.length > 0 && ch.samples[0]!.v.length > 1) {
      for (let i = 0; i < ch.samples[0]!.v.length; i++) {
        headers.push(`${ch.name}_${["x", "y", "z"][i] ?? i}_${ch.unit}`);
        axisLabels.push(`${ch.name}_${i}`);
      }
    } else {
      headers.push(`${ch.name}_${ch.unit}`);
      axisLabels.push(ch.name);
    }
  }

  const allTimes = new Set<number>();
  for (const ch of channels) {
    for (const s of ch.samples) allTimes.add(s.t);
  }
  const sortedTimes = [...allTimes].sort((a, b) => a - b);

  const lookup = new Map<string, Map<number, readonly number[]>>();
  for (const ch of channels) {
    const m = new Map<number, readonly number[]>();
    for (const s of ch.samples) m.set(s.t, s.v);
    lookup.set(ch.name, m);
  }

  const rows = [headers.join(",")];
  for (const t of sortedTimes) {
    const cols: (string | number)[] = [t];
    for (const ch of channels) {
      const v = lookup.get(ch.name)?.get(t);
      if (ch.samples.length > 0 && ch.samples[0]!.v.length > 1) {
        for (let i = 0; i < ch.samples[0]!.v.length; i++) {
          cols.push(v ? (v[i] ?? "") : "");
        }
      } else {
        cols.push(v ? (v[0] ?? "") : "");
      }
    }
    rows.push(cols.join(","));
  }
  return rows.join("\n");
}

function buildSummaryCsv(verdict: Verdict, experimentId: string): string {
  const rows = [
    "field,value",
    `experiment,${experimentId}`,
    `tier,${verdict.tier}`,
    `percent_error,${verdict.percentError.toFixed(4)}`,
    `z_score,${verdict.z.toFixed(4)}`,
    `confidence,${verdict.confidence}`,
    `dominant_term,${verdict.dominantTerm.name}`,
    `dominant_share,${(verdict.dominantTerm.share * 100).toFixed(1)}%`,
  ];
  return rows.join("\n");
}

function buildSeanceJson(
  experimentId: string,
  channels: readonly ChannelData[],
  verdict: Verdict | null,
  inputs: Record<string, number>,
): string {
  return JSON.stringify(
    {
      version: 1,
      format: ".seance",
      experiment: experimentId,
      timestamp: new Date().toISOString(),
      inputs,
      channels: Object.fromEntries(
        channels.map((ch) => [ch.name, { unit: ch.unit, samples: ch.samples }]),
      ),
      verdict: verdict
        ? {
            tier: verdict.tier,
            percentError: verdict.percentError,
            z: verdict.z,
            confidence: verdict.confidence,
          }
        : null,
    },
    null,
    2,
  );
}

export function ExportMenu({ experimentId, channels, verdict, inputs }: ExportMenuProps) {
  const handleRawCsv = useCallback(() => {
    const csv = buildRawCsv(channels);
    downloadBlob(csv, `${experimentId}-raw.csv`, "text/csv");
  }, [channels, experimentId]);

  const handleSummaryCsv = useCallback(() => {
    if (!verdict) return;
    const csv = buildSummaryCsv(verdict, experimentId);
    downloadBlob(csv, `${experimentId}-summary.csv`, "text/csv");
  }, [verdict, experimentId]);

  const handleSeanceJson = useCallback(() => {
    const json = buildSeanceJson(experimentId, channels, verdict, inputs);
    downloadBlob(json, `${experimentId}.seance`, "application/json");
  }, [experimentId, channels, verdict, inputs]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button onClick={handleRawCsv} style={btnStyle}>Export Raw CSV</button>
      <button onClick={handleSummaryCsv} disabled={!verdict} style={btnStyle}>Export Summary</button>
      <button onClick={handleSeanceJson} style={btnStyle}>Export .seance</button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 16px",
  background: "#1a0a2e",
  border: "1px solid #3d2466",
  color: "#c9bfe6",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};
