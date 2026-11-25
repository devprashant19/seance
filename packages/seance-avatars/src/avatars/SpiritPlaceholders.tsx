import type { SpiritKind } from "seance-core";

export interface SpiritPlaceholderProps {
  readonly kind: SpiritKind;
  readonly size?: number;
  readonly opacity?: number;
  readonly label?: string;
}

const SPIRIT_COLORS: Record<string, string> = {
  banshee: "#9966ff",
  watcher: "#66ccff",
  golem: "#cc8844",
  wisp: "#aaddff",
  organist: "#dd88aa",
  poltergeist: "#00ffff",
  revenant: "#667788",
};

const SPIRIT_PATHS: Record<string, string> = {
  banshee: "M50 15 C30 15 20 40 20 60 Q20 95 50 110 Q80 95 80 60 C80 40 70 15 Z",
  watcher: "M50 10 L80 50 L65 50 L75 90 L50 70 L25 90 L35 50 L20 50 Z",
  golem: "M30 20 H70 V80 L60 100 H40 L30 80 Z",
  wisp: "M50 15 Q70 30 65 55 Q80 70 60 90 Q50 100 40 90 Q20 70 35 55 Q30 30 50 15 Z",
  organist: "M35 20 H65 V50 H75 V90 H25 V50 H35 Z",
};

export function SpiritPlaceholder({
  kind,
  size = 120,
  opacity = 1,
  label,
}: SpiritPlaceholderProps) {
  const color = SPIRIT_COLORS[kind] ?? "#aaaacc";
  const path = SPIRIT_PATHS[kind] ?? SPIRIT_PATHS.wisp!;

  return (
    <div
      role="img"
      aria-label={label ?? `${kind} spirit`}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 100 120" width={size * 0.8} height={size * 0.96} style={{ opacity }}>
        <path d={path} fill={color} stroke="none" opacity={0.7} />
      </svg>
    </div>
  );
}

export interface RevenantWrapperProps {
  readonly children: React.ReactNode;
  readonly timestamp?: string;
}

export function RevenantWrapper({ children, timestamp }: RevenantWrapperProps) {
  return (
    <div
      style={{
        opacity: 0.45,
        filter: "saturate(0.3)",
        position: "relative",
      }}
      aria-label="Replaying past recording"
    >
      {children}
      {timestamp && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            fontFamily: "monospace",
            color: "#c9bfe6",
            background: "rgba(0,0,0,0.5)",
            padding: "1px 6px",
            borderRadius: 3,
          }}
        >
          {timestamp}
        </div>
      )}
    </div>
  );
}
