/**
 * React wrappers around GhostScene. Use the lazy versions (`Ghost`, `GhostChoir` from the package
 * root) so three.js only loads where a ghost is actually shown.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Quaternion } from "three";
import type { Mood } from "seance-core";
import { GhostScene, webglAvailable } from "./GhostScene.js";
import { MOOD_NEON } from "./colors.js";
import { PoltergeistFlat } from "../avatars/PoltergeistFlat.js";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export interface Ghost3DProps {
  /** Neon tint; defaults to the mood's colour (or cyan). */
  readonly color?: string;
  readonly mood?: Mood;
  /** Follow this orientation (e.g. the phone's). Omit for idle floating. */
  readonly quaternion?: Quaternion | null;
  /** 0..1 mouth opening (singing). */
  readonly mouth?: number;
  /** 0..1 shake jitter. */
  readonly shake?: number;
  readonly glow?: number;
  readonly muted?: boolean;
  /** Increment to play the ~3 s dizzy reaction (wobble, spiral eyes, topple). */
  readonly dizzy?: number;
  /** Name tag above the ghost. */
  readonly name?: string;
  readonly height?: number | string;
  readonly width?: number | string;
  readonly interactive?: boolean;
  readonly autoRotate?: boolean;
  /** Accessible description. */
  readonly label?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** One 3D ghost you can drag to see from any angle. */
export default function Ghost3D(props: Ghost3DProps) {
  const {
    color, mood, quaternion = null, mouth = 0, shake = 0, glow = 0, muted = false, dizzy = 0, name,
    height = 320, width = "100%", interactive = true, autoRotate, label, className, style,
  } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GhostScene | null>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const tint = color ?? (mood ? MOOD_NEON[mood] : "#00ffff");
  const follows = quaternion !== null;
  const lookRef = useRef({ name, tint, muted, mouth, shake, glow, quaternion });
  lookRef.current = { name, tint, muted, mouth, shake, glow, quaternion };
  const firstDizzy = useRef(dizzy);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !webglAvailable()) {
      setFailed(true);
      return;
    }
    let scene: GhostScene;
    try {
      scene = new GhostScene(el, { interactive, autoRotate: autoRotate ?? !follows, reducedMotion: reduced });
    } catch {
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    const l = lookRef.current;
    scene.setGhosts([{ id: "ghost", name: l.name, look: { color: l.tint, muted: l.muted } }]);
    scene.update("ghost", { mouth: l.mouth, shake: l.shake, glow: l.glow, quaternion: l.quaternion });
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Recreated only when behaviour flags change; looks are pushed by the effects below.
  }, [interactive, autoRotate, follows, reduced]);

  useEffect(() => {
    sceneRef.current?.setGhosts([{ id: "ghost", name, look: { color: tint, muted } }]);
  }, [name, tint, muted]);

  useEffect(() => {
    sceneRef.current?.update("ghost", { mouth, shake, glow, quaternion });
  }, [mouth, shake, glow, quaternion]);

  useEffect(() => {
    // Ignore the value we mounted with; react to each later bump.
    if (dizzy !== firstDizzy.current) sceneRef.current?.update("ghost", { dizzy });
  }, [dizzy]);

  const box: CSSProperties = { width, height, position: "relative", ...style };
  if (failed) {
    return (
      <div className={className} style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PoltergeistFlat mood={mood ?? "calm"} size={typeof height === "number" ? Math.min(height, 260) : 220} />
      </div>
    );
  }
  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label ?? `3D ghost${name ? ` of ${name}` : ""}. Drag to look around it.`}
      className={className}
      style={box}
    />
  );
}

export interface ChoirGhost {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  /** 0..1 loudness: opens the mouth and brightens the glow. */
  readonly amplitude: number;
  readonly muted?: boolean;
  /** Increment to make this ghost dizzy (~3 s). */
  readonly dizzy?: number;
}

/** Many singing ghosts in one canvas (one WebGL context for the whole choir). */
export function GhostChoir3D({ ghosts, height = 360, label }: { ghosts: readonly ChoirGhost[]; height?: number | string; label?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GhostScene | null>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const ghostsRef = useRef(ghosts);
  ghostsRef.current = ghosts;

  const pushRoster = (scene: GhostScene, list: readonly ChoirGhost[]) =>
    scene.setGhosts(list.map((g) => ({ id: g.id, name: g.name, look: { color: g.color, muted: Boolean(g.muted) } })));

  useEffect(() => {
    const el = hostRef.current;
    if (!el || !webglAvailable()) {
      setFailed(true);
      return;
    }
    let scene: GhostScene;
    try {
      scene = new GhostScene(el, { reducedMotion: reduced, autoRotate: false });
    } catch {
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    pushRoster(scene, ghostsRef.current);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reduced]);

  const roster = ghosts.map((g) => `${g.id}|${g.name}|${g.color}|${g.muted ? 1 : 0}`).join(",");
  useEffect(() => {
    if (sceneRef.current) pushRoster(sceneRef.current, ghostsRef.current);
  }, [roster]);

  useEffect(() => {
    for (const g of ghosts) {
      const a = g.muted ? 0 : Math.min(1, Math.max(0, g.amplitude));
      sceneRef.current?.update(g.id, { mouth: a, glow: a, dizzy: g.dizzy ?? 0 });
    }
  }, [ghosts]);

  if (failed) {
    return (
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", padding: 16 }}>
        {ghosts.map((g) => (
          <div key={g.id} style={{ textAlign: "center" }}>
            <PoltergeistFlat size={120} />
            <div style={{ fontSize: 13 }}>{g.name}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label ?? `3D choir of ${ghosts.length} ghost${ghosts.length === 1 ? "" : "s"}: ${ghosts.map((g) => g.name).join(", ")}. Drag to look around.`}
      style={{ width: "100%", height, position: "relative" }}
    />
  );
}
