import type { Verdict, ExperimentResult } from "../oracle/types.js";
import { speakSentence } from "seance-sonify";

const TIER_STYLES: Record<string, { bg: string; border: string; glow: string }> = {
  approves: { bg: "#0a1f0a", border: "#2a5a2a", glow: "0 0 20px rgba(50,200,80,0.2)" },
  veil: { bg: "#1f1a0a", border: "#5a4a2a", glow: "0 0 20px rgba(200,160,50,0.2)" },
  disagree: { bg: "#1a0a1f", border: "#4a2a5a", glow: "0 0 20px rgba(140,80,200,0.2)" },
  cursed: { bg: "#1f0a0a", border: "#5a2a2a", glow: "0 0 20px rgba(200,60,40,0.2)" },
  measured: { bg: "#0a1420", border: "#1f6f80", glow: "0 0 20px rgba(0,229,255,0.18)" },
};

function fmt(x: number, digits: number, suffix = ""): string {
  return Number.isFinite(x) ? `${x.toFixed(digits)}${suffix}` : "—";
}

/** Round the value to the uncertainty's first significant figure (2 if it starts with 1). */
function formatValue(r: ExperimentResult): string {
  const u = Math.abs(r.uncertainty);
  if (!Number.isFinite(u) || u === 0) return `${r.measured.toPrecision(4)} ${r.unit}`;
  const exp = Math.floor(Math.log10(u));
  const lead = u / 10 ** exp;
  const decimals = Math.max(0, -(exp - (lead < 2 ? 1 : 0)));
  return `${r.measured.toFixed(decimals)} ± ${u.toFixed(decimals)} ${r.unit}`;
}

export function OraclePanel({ verdict, result }: { verdict: Verdict; result?: ExperimentResult | null }) {
  const style = TIER_STYLES[verdict.tier] ?? TIER_STYLES["cursed"]!;

  return (
    <div style={{
      padding: 20, background: style.bg, border: `1px solid ${style.border}`,
      borderRadius: 12, boxShadow: style.glow, maxWidth: 480,
    }}>
      <h3 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4 }}>{verdict.spooky}</h3>
      <p style={{ fontSize: 13, color: "#b4a9d6", marginBottom: 16 }}>{verdict.plain}</p>

      {result && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: "#8a7bb5" }}>Your measurement ({result.quantity})</span>
          <p style={{ fontSize: 22, fontFamily: "monospace", color: "#00ffff" }}>{formatValue(result)}</p>
          {result.reference !== null && (
            <p style={{ fontSize: 12, color: "#8a7bb5" }}>
              Reference: {result.reference.toPrecision(4)} ± {result.referenceUncertainty.toPrecision(2)} {result.unit}
            </p>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, color: "#8a7bb5" }}>Error</span>
          <p style={{ fontSize: 18, fontFamily: "monospace" }}>{fmt(verdict.percentError, 2, "%")}</p>
        </div>
        <div>
          <span style={{ fontSize: 11, color: "#8a7bb5" }}>z-score</span>
          <p style={{ fontSize: 18, fontFamily: "monospace" }}>{fmt(verdict.z, 2)}</p>
        </div>
        <div>
          <span style={{ fontSize: 11, color: "#8a7bb5" }}>Confidence</span>
          <p style={{ fontSize: 14, textTransform: "capitalize" }}>{verdict.confidence}</p>
        </div>
      </div>

      {verdict.causes.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, color: "#b4a9d6", marginBottom: 8 }}>Diagnostics</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {verdict.causes.map((c, i) => (
              <li key={i} style={{
                marginBottom: 8, padding: "8px 12px",
                background: c.severity === "major" ? "rgba(200,50,40,0.1)" : "rgba(200,160,50,0.08)",
                borderRadius: 6, fontSize: 13,
              }}>
                <p style={{ marginBottom: 2 }}>{c.spooky}</p>
                <p style={{ color: "#b4a9d6", fontSize: 12 }}>{c.plain}</p>
                <p style={{ color: "#6a8", fontSize: 12, marginTop: 4 }}>Fix: {c.fix}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          speakSentence(
            `${verdict.spooky}. ${verdict.plain}. ${Number.isFinite(verdict.percentError) ? `Error ${verdict.percentError.toFixed(1)} percent. ` : ""}Confidence: ${verdict.confidence}.`,
            { urgent: true },
          );
        }}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          background: "#1c2b3a",
          border: "1px solid #3a5070",
          borderRadius: 6,
          color: "#7ffcff",
          cursor: "pointer",
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>🔊</span> Hear this result
      </button>
    </div>
  );
}
