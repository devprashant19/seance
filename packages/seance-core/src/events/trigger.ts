/**
 * Robust energy event trigger ("Trace Trigger").
 */

import { median, mad } from "../dsp/robust.js";

export interface EventTriggerOptions {
  readonly frameDurationMs?: number; // default 50 ms
  readonly thresholdSigma?: number;   // default 6.0
  readonly minConsecutiveFrames?: number; // default 2
  readonly refractoryMs?: number;     // default 1000 ms
}

export interface TriggeredEvent {
  readonly frameIndex: number;
  readonly sampleIndex: number;
  readonly tMs: number;
  readonly score: number;
}

export function detectEnergyEvents(
  t: readonly number[] | Float64Array,
  values: readonly number[] | Float32Array, // typically |a| or accel axis
  opts: EventTriggerOptions = {},
): TriggeredEvent[] {
  const n = t.length;
  if (n < 10) return [];

  const frameMs = opts.frameDurationMs ?? 50;
  const tau = opts.thresholdSigma ?? 6.0;
  const minFrames = opts.minConsecutiveFrames ?? 2;
  const refractoryMs = opts.refractoryMs ?? 1000;

  // 1. Compute frame energies: high-pass by first difference (v[i] - v[i-1]), squared mean per frame
  const frames: { tStart: number; tMid: number; energy: number; sampleIdx: number }[] = [];
  let frameStartIdx = 0;

  while (frameStartIdx < n - 1) {
    const tStart = t[frameStartIdx]!;
    let endIdx = frameStartIdx + 1;
    let sumSqDiff = 0;
    let count = 0;

    while (endIdx < n && t[endIdx]! - tStart < frameMs) {
      const diff = values[endIdx]! - values[endIdx - 1]!;
      sumSqDiff += diff * diff;
      count++;
      endIdx++;
    }

    if (count > 0) {
      const avgEnergy = sumSqDiff / count;
      frames.push({
        tStart,
        tMid: tStart + frameMs / 2,
        energy: avgEnergy,
        sampleIdx: frameStartIdx,
      });
    }

    frameStartIdx = endIdx;
  }

  const numFrames = frames.length;
  if (numFrames < 5) return [];

  const energies = new Float64Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    energies[i] = frames[i]!.energy;
  }

  const medEnergy = median(energies);
  const madEnergy = mad(energies, medEnergy);
  const scale = 1.4826 * madEnergy + 1e-6;

  const events: TriggeredEvent[] = [];
  let lastEventTime = -refractoryMs;
  let consecutiveCount = 0;

  for (let i = 0; i < numFrames; i++) {
    const frame = frames[i]!;
    const score = (frame.energy - medEnergy) / scale;

    if (score > tau) {
      consecutiveCount++;
      if (consecutiveCount >= minFrames && frame.tMid - lastEventTime >= refractoryMs) {
        events.push({
          frameIndex: i,
          sampleIndex: frame.sampleIdx,
          tMs: frame.tMid,
          score,
        });
        lastEventTime = frame.tMid;
        consecutiveCount = 0; // reset after triggering
      }
    } else {
      consecutiveCount = 0;
    }
  }

  return events;
}
