import { heightFromFallTime } from "./theory.js";

interface TimeSample {
  readonly t: number;
  readonly v: readonly number[];
}

const LOW_G_THRESHOLD = 2.0;
const MIN_FREEFALL_MS = 100;

export interface FreeFallResult {
  readonly h: number;
  readonly fallTimeS: number;
  readonly startMs: number;
  readonly endMs: number;
}

function accelMagnitude(v: readonly number[]): number {
  const x = v[0] ?? 0;
  const y = v[1] ?? 0;
  const z = v[2] ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
}

function interpolateEdge(
  tBefore: number,
  magBefore: number,
  tAfter: number,
  magAfter: number,
  threshold: number,
): number {
  if (Math.abs(magAfter - magBefore) < 1e-9) return (tBefore + tAfter) / 2;
  const frac = (threshold - magBefore) / (magAfter - magBefore);
  return tBefore + frac * (tAfter - tBefore);
}

export function analyzeFreeFall(
  accelSamples: readonly TimeSample[],
): FreeFallResult {
  if (accelSamples.length < 3) {
    return { h: 0, fallTimeS: 0, startMs: 0, endMs: 0 };
  }

  let bestStart = -1;
  let bestEnd = -1;
  let bestDuration = 0;
  let runStart = -1;

  for (let i = 0; i < accelSamples.length; i++) {
    const mag = accelMagnitude(accelSamples[i]!.v);
    if (mag < LOW_G_THRESHOLD) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1) {
        const duration = accelSamples[i - 1]!.t - accelSamples[runStart]!.t;
        if (duration > bestDuration) {
          bestDuration = duration;
          bestStart = runStart;
          bestEnd = i - 1;
        }
        runStart = -1;
      }
    }
  }

  if (runStart !== -1) {
    const duration = accelSamples[accelSamples.length - 1]!.t - accelSamples[runStart]!.t;
    if (duration > bestDuration) {
      bestDuration = duration;
      bestStart = runStart;
      bestEnd = accelSamples.length - 1;
    }
  }

  if (bestDuration < MIN_FREEFALL_MS || bestStart < 0) {
    return { h: 0, fallTimeS: 0, startMs: 0, endMs: 0 };
  }

  // Release and landing happen somewhere between the last "before" sample and the first "after"
  // sample; the midpoint of that gap is the unbiased estimate (whatever the landing spike looks like).
  const startMs = bestStart > 0
    ? (accelSamples[bestStart - 1]!.t + accelSamples[bestStart]!.t) / 2
    : accelSamples[bestStart]!.t;
  const endMs = bestEnd < accelSamples.length - 1
    ? (accelSamples[bestEnd]!.t + accelSamples[bestEnd + 1]!.t) / 2
    : accelSamples[bestEnd]!.t;

  const fallTimeS = (endMs - startMs) / 1000;
  const h = heightFromFallTime(fallTimeS);

  return { h, fallTimeS, startMs, endMs };
}
