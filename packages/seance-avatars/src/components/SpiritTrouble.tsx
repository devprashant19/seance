import React from "react";
import { TROUBLE_CATALOG, type SpiritTroubleCode } from "./trouble.js";

export interface SpiritTroubleProps {
  readonly code: SpiritTroubleCode;
  readonly onAction?: () => void;
  readonly onSecondaryAction?: () => void;
  readonly customPlain?: string;
}

export function SpiritTrouble({
  code,
  onAction,
  onSecondaryAction,
  customPlain,
}: SpiritTroubleProps) {
  const info = TROUBLE_CATALOG[code] ?? {
    code,
    spooky: "An unknown disturbance occurred.",
    plain: customPlain ?? "Please refresh or try another action.",
    actionLabel: "Dismiss",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: "16px 20px",
        background: "rgba(30, 20, 45, 0.85)",
        border: "1px solid #553377",
        borderRadius: 8,
        maxWidth: 420,
        margin: "16px auto",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        color: "#eee",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">
        ✦
      </div>
      <h3
        style={{
          margin: "0 0 6px 0",
          fontSize: 16,
          fontWeight: 600,
          color: "#e2b8ff",
          letterSpacing: "0.02em",
        }}
      >
        {info.spooky}
      </h3>
      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: 13,
          color: "#c0c0d0",
          lineHeight: 1.45,
        }}
      >
        {customPlain ?? info.plain}
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              padding: "8px 16px",
              background: "#442266",
              border: "1px solid #7744aa",
              color: "#f0e6ff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {info.actionLabel}
          </button>
        )}
        {info.replayFallback && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #665577",
              color: "#c0b0d8",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {info.secondaryActionLabel ?? "Watch a recorded haunting"}
          </button>
        )}
      </div>
    </div>
  );
}

