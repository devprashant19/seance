import { useState, useCallback } from "react";
import type { InputSpec } from "../experiments/pendulum-g/index.js";

interface InputsFormProps {
  readonly specs: readonly InputSpec[];
  readonly onSubmit: (values: Record<string, number>) => void;
}

export function InputsForm({ specs, onSubmit }: InputsFormProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of specs) {
      init[s.key] = s.defaultValue;
    }
    return init;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (key: string, spec: InputSpec, raw: string) => {
      const num = parseFloat(raw);
      if (isNaN(num)) {
        setErrors((prev) => ({ ...prev, [key]: "Enter a number" }));
        return;
      }
      if (num < spec.min || num > spec.max) {
        setErrors((prev) => ({
          ...prev,
          [key]: `Must be between ${spec.min} and ${spec.max} ${spec.unit}`,
        }));
        return;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setValues((prev) => ({ ...prev, [key]: num }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (Object.keys(errors).length === 0) {
        onSubmit(values);
      }
    },
    [errors, values, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {specs.map((spec) => (
        <label key={spec.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#c9bfe6" }}>
            {spec.label} ({spec.unit})
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              step="any"
              defaultValue={spec.defaultValue}
              onChange={(e) => handleChange(spec.key, spec, e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                background: "#1a0a2e",
                border: errors[spec.key] ? "1px solid #a44" : "1px solid #3d2466",
                borderRadius: 4,
                color: "#eee8ff",
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 12, color: "#8a7bb5", minWidth: 40 }}>{spec.unit}</span>
          </div>
          {errors[spec.key] && (
            <span style={{ fontSize: 11, color: "#f66" }}>{errors[spec.key]}</span>
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={Object.keys(errors).length > 0}
        style={{
          marginTop: 8,
          padding: "10px 24px",
          background: Object.keys(errors).length > 0 ? "#1f0a35" : "#2a0a4a",
          border: "1px solid #5a2d8c",
          color: "#e6e0ff",
          borderRadius: 6,
          cursor: Object.keys(errors).length > 0 ? "not-allowed" : "pointer",
          fontSize: 14,
        }}
      >
        Start Recording
      </button>
    </form>
  );
}
