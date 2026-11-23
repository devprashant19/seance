import { useCallback } from "react";
import type { Verdict, BudgetTerm } from "../../oracle/types.js";
import { formatMeasured } from "./formatter.js";

interface ChannelData {
  readonly name: string;
  readonly unit: string;
  readonly samples: readonly { t: number; v: readonly number[] }[];
}

interface NotebookViewProps {
  readonly experimentId: string;
  readonly experimentName: string;
  readonly spookyTitle: string;
  readonly plainDescription: string;
  readonly safetyNote: string;
  readonly inputs: Record<string, number>;
  readonly inputSpecs: readonly { key: string; label: string; unit: string }[];
  readonly channels: readonly ChannelData[];
  readonly verdict: Verdict;
  readonly budget: readonly BudgetTerm[];
  readonly deviceInfo?: string;
  readonly onClose: () => void;
}

function buildCsvContent(channels: readonly ChannelData[]): string {
  if (channels.length === 0) return "";
  const headers = ["t_ms"];
  for (const ch of channels) {
    const axes = ch.samples[0]?.v.length ?? 1;
    if (axes > 1) {
      for (let i = 0; i < axes; i++) {
        headers.push(`${ch.name}_${["x", "y", "z"][i] ?? i}_${ch.unit}`);
      }
    } else {
      headers.push(`${ch.name}_${ch.unit}`);
    }
  }

  const allTimes = new Set<number>();
  for (const ch of channels) {
    for (const s of ch.samples) allTimes.add(s.t);
  }
  const sorted = [...allTimes].sort((a, b) => a - b);

  const lookup = new Map<string, Map<number, readonly number[]>>();
  for (const ch of channels) {
    const m = new Map<number, readonly number[]>();
    for (const s of ch.samples) m.set(s.t, s.v);
    lookup.set(ch.name, m);
  }

  const rows = [headers.join(",")];
  for (const t of sorted) {
    const cols: (string | number)[] = [t];
    for (const ch of channels) {
      const v = lookup.get(ch.name)?.get(t);
      const axes = ch.samples[0]?.v.length ?? 1;
      if (axes > 1) {
        for (let i = 0; i < axes; i++) cols.push(v ? (v[i] ?? "") : "");
      } else {
        cols.push(v ? (v[0] ?? "") : "");
      }
    }
    rows.push(cols.join(","));
  }
  return rows.join("\n");
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

function DataPreviewTable({ channels }: { channels: readonly ChannelData[] }) {
  const primary = channels[0];
  if (!primary || primary.samples.length === 0) {
    return <p style={{ color: "#889", fontStyle: "italic" }}>No data recorded.</p>;
  }

  const samples = primary.samples;
  const axes = samples[0]?.v.length ?? 1;
  const previewCount = 5;
  const head = samples.slice(0, previewCount);
  const tail = samples.length > previewCount * 2 ? samples.slice(-previewCount) : [];
  const showEllipsis = samples.length > previewCount * 2;

  const headerCells = ["t (ms)"];
  for (let i = 0; i < axes; i++) {
    headerCells.push(`${primary.name}_${["x", "y", "z"][i] ?? i}`);
  }

  const renderRow = (s: { t: number; v: readonly number[] }, idx: number) => (
    <tr key={idx}>
      <td style={cellStyle}>{s.t.toFixed(1)}</td>
      {Array.from({ length: axes }, (_, i) => (
        <td key={i} style={cellStyle}>{(s.v[i] ?? 0).toFixed(4)}</td>
      ))}
    </tr>
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
      <thead>
        <tr>
          {headerCells.map((h, i) => (
            <th key={i} style={{ ...cellStyle, fontWeight: 600, background: "rgba(100,120,180,0.1)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {head.map(renderRow)}
        {showEllipsis && (
          <tr>
            <td colSpan={axes + 1} style={{ ...cellStyle, textAlign: "center", color: "#667" }}>
              ... {samples.length - previewCount * 2} rows omitted ...
            </td>
          </tr>
        )}
        {tail.map((s, i) => renderRow(s, i + 1000))}
      </tbody>
    </table>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: "1px solid rgba(100,120,180,0.15)",
  textAlign: "right",
};

export function NotebookView({
  experimentId,
  experimentName,
  spookyTitle,
  plainDescription,
  safetyNote,
  inputs,
  inputSpecs,
  channels,
  verdict,
  budget,
  deviceInfo,
  onClose,
}: NotebookViewProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const totalSamples = channels.reduce((sum, ch) => sum + ch.samples.length, 0);

  const dominantBudget = budget.length > 0
    ? [...budget].sort((a, b) => b.share - a.share)[0]!
    : null;

  const handlePrint = useCallback(() => { window.print(); }, []);

  const handleCsv = useCallback(() => {
    const csv = buildCsvContent(channels);
    downloadBlob(csv, `${experimentId}-data.csv`, "text/csv");
  }, [channels, experimentId]);

  return (
    <div className="notebook-overlay" style={overlayStyle}>
      <style>{printStyles}</style>
      <div className="notebook-report" style={reportStyle}>
        <div className="notebook-no-print" style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={handlePrint} style={actionBtnStyle}>Print / Save PDF</button>
          <button onClick={handleCsv} style={actionBtnStyle}>Export CSV</button>
          <button onClick={onClose} style={{ ...actionBtnStyle, marginLeft: "auto" }}>Close</button>
        </div>

        {/* Title */}
        <h1 style={h1Style}>{experimentName}</h1>
        <p style={{ fontStyle: "italic", color: "#a9b4c8", fontSize: 15, marginBottom: 4 }}>{spookyTitle}</p>
        <p style={{ fontSize: 12, color: "#778", marginBottom: 24 }}>
          {dateStr} at {timeStr} {deviceInfo ? `· ${deviceInfo}` : ""} {"·"} Experiment: {experimentId}
        </p>

        <hr style={dividerStyle} />

        {/* Aim */}
        <h2 style={h2Style}>Aim</h2>
        <p style={bodyStyle}>{plainDescription}</p>

        {/* Apparatus */}
        <h2 style={h2Style}>Apparatus</h2>
        <ul style={{ ...bodyStyle, paddingLeft: 24 }}>
          <li>{deviceInfo ?? "Mobile device"} (sensor channels: {channels.map((c) => c.name).join(", ")})</li>
          {inputSpecs.map((spec) => (
            <li key={spec.key}>
              {spec.label}: {inputs[spec.key] ?? spec.key} {spec.unit}
            </li>
          ))}
        </ul>
        {safetyNote && (
          <p style={{ fontSize: 12, color: "#ca8", marginTop: 8 }}>Safety: {safetyNote}</p>
        )}

        {/* Method */}
        <h2 style={h2Style}>Method</h2>
        <ol style={{ ...bodyStyle, paddingLeft: 24 }}>
          <li>The apparatus was set up and input parameters were recorded.</li>
          <li>The phone was positioned and sensor recording was started.</li>
          <li>The experimental motion was performed for the recording duration.</li>
          <li>Recording was stopped and data was submitted for analysis.</li>
        </ol>

        {/* Raw Data */}
        <h2 style={h2Style}>Raw Data</h2>
        <p style={{ ...bodyStyle, marginBottom: 8 }}>
          {totalSamples} samples across {channels.length} channel{channels.length !== 1 ? "s" : ""}.
        </p>
        <DataPreviewTable channels={channels} />
        <p style={{ fontSize: 11, color: "#667", marginTop: 4 }}>Full data available via CSV export.</p>

        <hr style={dividerStyle} />

        {/* Result */}
        <h2 style={h2Style}>Result</h2>
        <p style={{ fontSize: 18, fontFamily: "Georgia, serif", marginBottom: 8 }}>
          {formatMeasured(verdict.percentError !== undefined ? (verdict.percentError / 100 * (budget[0]?.value ?? 0) + (budget[0]?.value ?? 0)) : 0, budget[0]?.uncertainty ?? 0, budget[0]?.unit ?? "")}
        </p>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: "#667" }}>Percent Error</span>
            <p style={{ fontSize: 16, fontFamily: "monospace" }}>{verdict.percentError.toFixed(2)}%</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "#667" }}>z-score</span>
            <p style={{ fontSize: 16, fontFamily: "monospace" }}>{verdict.z.toFixed(2)}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "#667" }}>Confidence</span>
            <p style={{ fontSize: 14, textTransform: "capitalize" }}>{verdict.confidence}</p>
          </div>
        </div>

        {/* Error Analysis */}
        <h2 style={h2Style}>Error Analysis</h2>
        {budget.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 600 }}>Source</th>
                <th style={cellStyle}>Value</th>
                <th style={cellStyle}>Uncertainty</th>
                <th style={cellStyle}>Share</th>
              </tr>
            </thead>
            <tbody>
              {budget.map((term) => (
                <tr key={term.name} style={term.name === dominantBudget?.name ? { background: "rgba(100,120,180,0.08)" } : {}}>
                  <td style={{ ...cellStyle, textAlign: "left" }}>{term.name}{term.name === dominantBudget?.name ? " (dominant)" : ""}</td>
                  <td style={cellStyle}>{term.value.toPrecision(4)} {term.unit}</td>
                  <td style={cellStyle}>{term.uncertainty.toPrecision(2)} {term.unit}</td>
                  <td style={cellStyle}>{(term.share * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {verdict.causes.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, color: "#889", marginBottom: 8 }}>Diagnostics</h3>
            <ul style={{ paddingLeft: 24, fontSize: 13 }}>
              {verdict.causes.map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <strong>{c.severity}:</strong> {c.plain}
                  {c.fix && <span style={{ color: "#6a8" }}> — Fix: {c.fix}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr style={dividerStyle} />

        {/* Conclusion */}
        <h2 style={h2Style}>Conclusion</h2>
        <blockquote style={{ borderLeft: "3px solid #446", paddingLeft: 16, fontStyle: "italic", color: "#a9b4c8", margin: "0 0 8px 0" }}>
          {verdict.spooky}
        </blockquote>
        <p style={bodyStyle}>{verdict.plain}</p>
        {dominantBudget && (
          <p style={{ ...bodyStyle, marginTop: 8 }}>
            The dominant source of uncertainty was <strong>{dominantBudget.name}</strong>,
            contributing {(dominantBudget.share * 100).toFixed(0)}% of the total error budget.
          </p>
        )}

        {/* Appendix */}
        <h2 style={h2Style}>Appendix</h2>
        <ul style={{ ...bodyStyle, paddingLeft: 24, fontSize: 12, color: "#778" }}>
          <li>Generated: {now.toISOString()}</li>
          <li>Experiment ID: {experimentId}</li>
          <li>Verdict tier: {verdict.tier}</li>
          <li>Total samples: {totalSamples}</li>
          <li>Generated with Séance — phone-based physics lab</li>
        </ul>

        <div className="notebook-no-print" style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button onClick={handlePrint} style={actionBtnStyle}>Print / Save PDF</button>
          <button onClick={handleCsv} style={actionBtnStyle}>Export CSV</button>
          <button onClick={onClose} style={{ ...actionBtnStyle, marginLeft: "auto" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.85)",
  overflowY: "auto",
  padding: 16,
};

const reportStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: 32,
  background: "#0f1020",
  border: "1px solid #223",
  borderRadius: 12,
  color: "#ccd4e0",
  fontFamily: "Georgia, 'Times New Roman', serif",
  lineHeight: 1.7,
};

const h1Style: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 400,
  marginBottom: 4,
  fontFamily: "Georgia, serif",
};

const h2Style: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 400,
  marginTop: 28,
  marginBottom: 12,
  borderBottom: "1px solid rgba(100,120,180,0.15)",
  paddingBottom: 4,
  fontFamily: "Georgia, serif",
};

const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  marginBottom: 12,
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(100,120,180,0.1)",
  margin: "24px 0",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  background: "#1a1a3e",
  border: "1px solid #446",
  color: "#aabbdd",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const printStyles = `
@media print {
  body { background: white !important; color: black !important; }
  .notebook-overlay {
    position: static !important;
    background: white !important;
    padding: 0 !important;
  }
  .notebook-report {
    background: white !important;
    color: black !important;
    border: none !important;
    box-shadow: none !important;
    padding: 20px !important;
    max-width: 100% !important;
  }
  .notebook-report h1, .notebook-report h2, .notebook-report h3 {
    color: black !important;
  }
  .notebook-report p, .notebook-report li, .notebook-report td, .notebook-report th {
    color: #222 !important;
  }
  .notebook-report blockquote {
    color: #333 !important;
    border-left-color: #999 !important;
  }
  .notebook-report hr {
    border-top-color: #ccc !important;
  }
  .notebook-no-print {
    display: none !important;
  }
  h2 {
    page-break-after: avoid;
  }
  table {
    page-break-inside: avoid;
  }
}
`;
