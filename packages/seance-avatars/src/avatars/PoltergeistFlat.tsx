import type { Mood } from "seance-core";
import { moodVisuals } from "../mood/visuals.js";

export interface PoltergeistFlatProps {
  readonly tiltDeg?: number;
  readonly rollDeg?: number;
  readonly mood?: Mood;
  readonly size?: number;
}

export function PoltergeistFlat({
  tiltDeg = 0,
  rollDeg = 0,
  mood = "calm",
  size = 200,
}: PoltergeistFlatProps) {
  const v = moodVisuals(mood);
  const hsl = `hsl(${v.hue}, 60%, 70%)`;

  return (
    <div
      role="img"
      aria-label={`Ghost tilted ${Math.round(tiltDeg)} degrees`}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 100 120"
        width={size * 0.8}
        height={size * 0.96}
        style={{
          transform: `rotate(${rollDeg}deg)`,
          transition: "transform 0.1s ease-out",
          opacity: v.opacity,
          filter: `drop-shadow(0 0 ${v.glow * 10}px ${hsl})`,
        }}
      >
        <path
          d="M50 10 C25 10 15 35 15 55 C15 80 15 110 15 110 L25 100 L35 110 L45 100 L55 110 L65 100 L75 110 L85 100 L85 110 C85 110 85 80 85 55 C85 35 75 10 50 10 Z"
          fill={hsl}
          stroke="none"
        />
        <ellipse cx="38" cy="50" rx="5" ry="7" fill="#111" />
        <ellipse cx="62" cy="50" rx="5" ry="7" fill="#111" />
        <circle cx="50" cy="70" rx="4" fill={`hsl(${v.hue}, 80%, 85%)`} opacity={v.glow} />
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 4,
          right: 4,
          fontSize: 11,
          fontFamily: "monospace",
          color: "#999",
          pointerEvents: "none",
        }}
      >
        {Math.round(tiltDeg)}°
      </div>
    </div>
  );
}
