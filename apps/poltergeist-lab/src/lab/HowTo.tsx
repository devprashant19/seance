import { GUIDES, SOURCE_NOTE } from "./guides.js";

/** Setup diagram + numbered steps for one experiment (shown before recording). */
export function HowTo({ experimentId, compact = false }: { experimentId: string; compact?: boolean }) {
  const g = GUIDES[experimentId];
  if (!g) return null;
  const src = SOURCE_NOTE[g.source];
  return (
    <section aria-label="How to do this experiment" className="sx-box" style={{
      padding: 16, marginBottom: 16,
    }}>
      <p style={{ fontSize: 15, color: "#eee8ff", marginBottom: 10 }}>{g.what}</p>
      <g.Illustration />
      {!compact && (
        <>
          <p style={{ fontSize: 12, color: "#b4a9d6", margin: "12px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>You need</p>
          <ul style={{ fontSize: 13, color: "#c9bfe6", paddingLeft: 18 }}>
            {g.needs.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      )}
      <p style={{ fontSize: 12, color: "#b4a9d6", margin: "12px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>What to do</p>
      <ol style={{ fontSize: 13, color: "#e6e0ff", paddingLeft: 18, lineHeight: 1.6 }}>
        {g.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p style={{ fontSize: 12, color: g.source === "phone" ? "#00ff99" : "#ffe066", marginTop: 10 }}>
        <strong>{src.badge}</strong> · {src.detail}
      </p>
    </section>
  );
}
