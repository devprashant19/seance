import type { Mood } from "seance-core";

/** Neon ghost tint for each spirit mood (arcade palette). */
export const MOOD_NEON: Record<Mood, string> = {
  calm: "#00ffff",
  uneasy: "#ffff33",
  restless: "#ff3b8d",
  fading: "#bd00ff",
};

/** Distinct neon tints for players, in join order. */
export const PLAYER_NEON = ["#00ffff", "#ff00ff", "#ffff33", "#00ff99", "#ff7a00", "#bd00ff", "#3d8bff", "#ff3b8d", "#7dfff5"] as const;

export function playerNeon(index: number): string {
  const n = PLAYER_NEON.length;
  return PLAYER_NEON[((index % n) + n) % n]!;
}
