import type { SpiritDiagnosis, DiagnosisSeverity } from "./explain.js";

interface AskTheSpiritModalProps {
  readonly diagnoses: readonly SpiritDiagnosis[];
  readonly onClose: () => void;
}

const SEVERITY_COLORS: Record<DiagnosisSeverity, string> = {
  high: "#c44",
  medium: "#ca8",
  low: "#8ac",
  info: "#6a8",
};

const SEVERITY_LABELS: Record<DiagnosisSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export function AskTheSpiritModal({ diagnoses, onClose }: AskTheSpiritModalProps) {
  return (
    <div
      role="dialog"
      aria-label="The Spirit Speaks"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#0e0e1a",
          border: "1px solid #334",
          borderRadius: 10,
          padding: 24,
          maxWidth: 520,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 400, color: "#dde", marginTop: 0, marginBottom: 16 }}>
          The Spirit Speaks
        </h2>

        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {diagnoses.length === 0 && (
            <p style={{ color: "#889", fontSize: 14 }}>The spirit has nothing to say.</p>
          )}
          {diagnoses.map((d) => (
            <div
              key={d.id}
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${SEVERITY_COLORS[d.severity]}33`,
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: SEVERITY_COLORS[d.severity],
                  background: `${SEVERITY_COLORS[d.severity]}18`,
                  padding: "2px 8px",
                  borderRadius: 3,
                  marginBottom: 8,
                }}
              >
                {SEVERITY_LABELS[d.severity]}
              </span>
              <p style={{ fontSize: 14, fontStyle: "italic", color: "#aabbdd", margin: "8px 0 6px" }}>
                {d.spooky}
              </p>
              <p style={{ fontSize: 13, color: "#99a", margin: "0 0 6px" }}>
                {d.plain}
              </p>
              <p style={{ fontSize: 13, color: "#8a8", margin: 0 }}>
                <strong style={{ fontWeight: 600 }}>Fix:</strong> {d.fix}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 18,
            padding: "8px 24px",
            background: "#1a1a2e",
            border: "1px solid #446",
            color: "#aab",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
