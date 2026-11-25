import type { DecodedBatch } from "seance-core/transports/phone-bridge";

const G = 9.81;

/** A firm shake of a phone (m/s² of linear acceleration, gravity removed). */
export const SHAKE_THRESHOLD = 14;

/**
 * Strongest linear acceleration in a phone batch (m/s², gravity removed). Uses the `accel` channel
 * when the phone provides it, otherwise `accelG` minus 1 g.
 */
export function peakShake(batch: DecodedBatch): number {
  const lin = batch.channels["accel"];
  if (lin && lin.t.length > 0 && lin.values.length >= 3) {
    let peak = 0;
    for (let i = 0; i < lin.t.length; i++) {
      peak = Math.max(peak, Math.hypot(lin.values[0]![i]!, lin.values[1]![i]!, lin.values[2]![i]!));
    }
    return peak;
  }
  const withG = batch.channels["accelG"];
  if (withG && withG.t.length > 0 && withG.values.length >= 3) {
    let peak = 0;
    for (let i = 0; i < withG.t.length; i++) {
      const m = Math.hypot(withG.values[0]![i]!, withG.values[1]![i]!, withG.values[2]![i]!);
      peak = Math.max(peak, Math.abs(m - G));
    }
    return peak;
  }
  return 0;
}

/**
 * Turns a stream of batches into "dizzy" triggers: fires on a firm shake, then ignores further
 * shakes until the ~3 s animation has finished.
 */
export class ShakeTrigger {
  private _until = 0;

  constructor(
    private readonly _threshold = SHAKE_THRESHOLD,
    private readonly _holdMs = 3200,
  ) {}

  /** Returns true when this batch should start a new dizzy animation. */
  feed(batch: DecodedBatch, now = Date.now()): boolean {
    if (now < this._until) return false;
    if (peakShake(batch) < this._threshold) return false;
    this._until = now + this._holdMs;
    return true;
  }
}
