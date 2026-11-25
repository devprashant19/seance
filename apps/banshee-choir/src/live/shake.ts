import type { DecodedBatch } from "./frames.js";

/** A firm shake (m/s² of linear acceleration, gravity removed). */
export const SHAKE_THRESHOLD = 14;
export const DIZZY_HOLD_MS = 3200;

/** Strongest linear acceleration in a phone batch (m/s²), from the gravity-free `accel` channel. */
export function peakShake(batch: DecodedBatch): number {
  const ch = batch.channels["accel"];
  if (!ch || ch.values.length < 3) return 0;
  let peak = 0;
  for (let i = 0; i < ch.t.length; i++) {
    peak = Math.max(peak, Math.hypot(ch.values[0]![i]!, ch.values[1]![i]!, ch.values[2]![i]!));
  }
  return peak;
}
