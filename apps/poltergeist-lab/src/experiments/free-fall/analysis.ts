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

  let startMs = accelSamples[bestStart]!.t;
  if (bestStart > 0) {
    startMs = interpolateEdge(
      accelSamples[bestStart - 1]!.t,
      accelMagnitude(accelSamples[bestStart - 1]!.v),
      accelSamples[bestStart]!.t,
      accelMagnitude(accelSamples[bestStart]!.v),
      LOW_G_THRESHOLD,
    );
  }

  let endMs = accelSamples[bestEnd]!.t;
  if (bestEnd < accelSamples.length - 1) {
    endMs = interpolateEdge(
      accelSamples[bestEnd]!.t,
      accelMagnitude(accelSamples[bestEnd]!.v),
      accelSamples[bestEnd + 1]!.t,
      accelMagnitude(accelSamples[bestEnd + 1]!.v),
      LOW_G_THRESHOLD,
    );
  }

  const fallTimeS = (endMs - startMs) / 1000;
  const h = heightFromFallTime(fallTimeS);

  return { h, fallTimeS, startMs, endMs };
}
