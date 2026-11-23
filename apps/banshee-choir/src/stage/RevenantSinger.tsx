import { type CSSProperties } from "react";

interface RevenantSingerProps {
  id: string;
  progress: number;
  muted: boolean;
  onMute: () => void;
  onDismiss: () => void;
}

export function RevenantSinger({ id, progress, muted, onMute, onDismiss }: RevenantSingerProps) {
  const angle = progress * 360;
  const r = 28;
  const cx = 40;
  const cy = 40;
  const rad = (angle - 90) * (Math.PI / 180);
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;

  const arcPath = angle > 0
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`
    : "";

  return (
    <div style={containerStyle}>
      <svg viewBox="0 0 80 80" width={64} height={64} aria-label={`Loop ${id}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334" strokeWidth={2} />
        {arcPath && (
          <path d={arcPath} fill="none" stroke="#8866cc" strokeWidth={2.5} strokeLinecap="round" />
        )}
        <ellipse cx={cx} cy={cy} rx={16} ry={20} fill="#8866cc" opacity={muted ? 0.15 : 0.35} />
        <circle cx={35} cy={36} r={1.5} fill="#222" opacity={0.5} />
        <circle cx={45} cy={36} r={1.5} fill="#222" opacity={0.5} />
      </svg>
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        <button onClick={onMute} style={btnStyle}>{muted ? "M" : "m"}</button>
        <button onClick={onDismiss} style={btnStyle}>x</button>
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  padding: 4, opacity: 0.7,
};

const btnStyle: CSSProperties = {
  width: 20, height: 20, borderRadius: 3, border: "1px solid #445",
  background: "#1a1a2e", color: "#667", cursor: "pointer", fontSize: 10, padding: 0,
};
