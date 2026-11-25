import { useRef, useCallback, useState } from "react";
import type { Mood } from "seance-core";
import { moodVisuals } from "../mood/visuals.js";
import { MOOD_COPY } from "../mood/copy.js";

export interface MoodBadgeProps {
  readonly mood: Mood;
  readonly size?: number;
}

function BadgeShape({ mood, size, hue }: { mood: Mood; size: number; hue: number }) {
  const color = `hsl(${hue}, 70%, 55%)`;
  const r = size / 2;
  const cx = r;
  const cy = r;

  switch (mood) {
    case "calm":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={cx} cy={cy} r={r * 0.8} fill={color} />
        </svg>
      );
    case "uneasy":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <path
            d={`M ${cx - r * 0.8} ${cy} A ${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.8} ${cy} Z`}
            fill={color}
          />
        </svg>
      );
    case "restless": {
      const points: string[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? r * 0.85 : r * 0.45;
        points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
      }
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <polygon points={points.join(" ")} fill={color} />
        </svg>
      );
    }
    case "fading":
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={cx} cy={cy} r={r * 0.75} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" />
        </svg>
      );
  }
}

export function MoodBadge({ mood, size = 24 }: MoodBadgeProps) {
  const v = moodVisuals(mood);
  const copy = MOOD_COPY[mood];

  return (
    <span
      role="status"
      aria-label={`Mood: ${mood}. ${copy.plain}`}
      title={copy.plain}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "default" }}
    >
      <BadgeShape mood={mood} size={size} hue={v.hue} />
    </span>
  );
}

export interface MoodTooltipProps {
  readonly mood: Mood;
  readonly children: React.ReactNode;
}

export function MoodTooltip({ mood, children }: MoodTooltipProps) {
  const [open, setOpen] = useState(false);
  const lastAnnounce = useRef(0);
  const copy = MOOD_COPY[mood];

  const handleFocus = useCallback(() => setOpen(true), []);
  const handleBlur = useCallback(() => setOpen(false), []);

  const now = Date.now();
  const shouldAnnounce = now - lastAnnounce.current > 5000;
  if (shouldAnnounce && open) {
    lastAnnounce.current = now;
  }

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="button"
      aria-describedby={open ? "mood-tooltip" : undefined}
    >
      {children}
      {open && (
        <span
          id="mood-tooltip"
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a0a2e",
            color: "#eee8ff",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <strong>{copy.spooky}</strong>
          <br />
          {copy.plain}
          <br />
          <em style={{ color: "#c9bfe6" }}>{copy.action}</em>
        </span>
      )}
      {shouldAnnounce && open && (
        <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
          {copy.plain}. {copy.action}
        </span>
      )}
    </span>
  );
}
