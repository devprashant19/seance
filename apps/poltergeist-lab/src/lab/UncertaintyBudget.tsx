import type { BudgetTerm } from "../oracle/types.js";

interface UncertaintyBudgetProps {
  readonly budget: readonly BudgetTerm[];
  readonly dominantName: string;
}

export function UncertaintyBudget({ budget, dominantName }: UncertaintyBudgetProps) {
  const totalVariance = budget.reduce((sum, t) => sum + t.uncertainty ** 2, 0);

  return (
    <div style={{ maxWidth: 480 }}>
      <h4 style={{ fontSize: 13, color: "#889", marginBottom: 12 }}>Uncertainty Budget</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {budget.map((term) => {
          const share = totalVariance > 0 ? (term.uncertainty ** 2 / totalVariance) * 100 : 0;
          const isDominant = term.name === dominantName;
          return (
            <div key={term.name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: isDominant ? "#aabbff" : "#889" }}>
                  {term.name} {isDominant && "★"}
                </span>
                <span style={{ color: "#667", fontFamily: "monospace" }}>
                  ±{term.uncertainty.toExponential(2)} {term.unit} ({share.toFixed(0)}%)
                </span>
              </div>
              <div style={{ height: 6, background: "#1a1a2e", borderRadius: 3 }}>
                <div style={{
                  width: `${Math.min(share, 100)}%`,
                  height: "100%",
                  background: isDominant ? "#6688ff" : "#445566",
                  borderRadius: 3,
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
