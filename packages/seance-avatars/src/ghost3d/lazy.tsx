/**
 * Lazy entry points: the page renders immediately and three.js streams in only when a ghost is
 * on screen.
 */
import { lazy, Suspense } from "react";
import type { Ghost3DProps, ChoirGhost } from "./Ghost3D.js";

const Ghost3DImpl = lazy(() => import("./Ghost3D.js"));
const ChoirImpl = lazy(() => import("./Ghost3D.js").then((m) => ({ default: m.GhostChoir3D })));

function Summoning({ height }: { height: number | string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00ffff",
        fontFamily: "var(--sx-font-pixel, monospace)",
        fontSize: 10,
        letterSpacing: 2,
        textShadow: "0 0 8px #00ffff",
      }}
    >
      SUMMONING…
    </div>
  );
}

export function Ghost(props: Ghost3DProps) {
  return (
    <Suspense fallback={<Summoning height={props.height ?? 320} />}>
      <Ghost3DImpl {...props} />
    </Suspense>
  );
}

export function GhostChoir(props: { ghosts: readonly ChoirGhost[]; height?: number | string; label?: string }) {
  return (
    <Suspense fallback={<Summoning height={props.height ?? 360} />}>
      <ChoirImpl {...props} />
    </Suspense>
  );
}

export type { Ghost3DProps, ChoirGhost };
