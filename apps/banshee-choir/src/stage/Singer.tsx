import { type CSSProperties } from "react";

interface SingerProps {
  name: string;
  color: string;
  amplitude: number;
  muted: boolean;
  solo: boolean;
  onMute: () => void;
  onSolo: () => void;
}

export function Singer({ name, color, amplitude, muted, solo, onMute, onSolo }: SingerProps) {
  const mouthOpen = Math.min(1, amplitude) * 12;
  const rippleScale = 1 + amplitude * 0.3;

  return (
    <div style={containerStyle}>
      <svg viewBox="0 0 80 100" width={80} height={100} aria-label={`${name} singing`}>
        {amplitude > 0.1 && (
          <>
            <circle cx={40} cy={50} r={35 * rippleScale} fill="none" stroke={color} strokeWidth={0.5} opacity={0.2} />
            <circle cx={40} cy={50} r={28 * rippleScale} fill="none" stroke={color} strokeWidth={0.3} opacity={0.15} />
          </>
        )}
        <ellipse cx={40} cy={40} rx={22} ry={28} fill={color} opacity={muted ? 0.3 : 0.7} />
        <circle cx={33} cy={34} r={2.5} fill="#111" />
        <circle cx={47} cy={34} r={2.5} fill="#111" />
        <ellipse cx={40} cy={48} rx={4} ry={1 + mouthOpen} fill="#111" />
      </svg>
      <span style={{ fontSize: 11, color: "#aab", marginTop: 2 }}>{name}</span>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <button onClick={onMute} style={btnStyle(muted)}>
          {muted ? "M" : "m"}
        </button>
        <button onClick={onSolo} style={btnStyle(solo)}>
          {solo ? "S" : "s"}
        </button>
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", padding: 8,
};

function btnStyle(active: boolean): CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 4, border: "1px solid #445",
    background: active ? "#446" : "#1a1a2e", color: active ? "#fff" : "#667",
    cursor: "pointer", fontSize: 11, padding: 0,
  };
}
