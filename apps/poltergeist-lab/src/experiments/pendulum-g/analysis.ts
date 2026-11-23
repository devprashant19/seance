import { correctedG } from "./theory.js";

interface TimeSample {
  readonly t: number;
  readonly v: readonly number[];
}

interface PendulumInputs {
  readonly lengthM: number;
  readonly phoneHeightM: number;
}

export interface PendulumResult {
  readonly g: number;
  readonly periodS: number;
  readonly amplitudeRad: number;
  readonly cycleCount: number;
}

function resample(samples: readonly TimeSample[], targetHz: number): TimeSample[] {
  if (samples.length < 2) return [...samples];
  const t0 = samples[0]!.t;
  const tEnd = samples[samples.length - 1]!.t;
  const dt = 1000 / targetHz;
  const result: TimeSample[] = [];
  let si = 0;
  for (let t = t0; t <= tEnd; t += dt) {
    while (si < samples.length - 1 && samples[si + 1]!.t <= t) si++;
    const s = samples[si]!;
    result.push({ t, v: s.v });
  }
  return result;
}

function dominantAxis(samples: readonly TimeSample[]): number {
  const variances = [0, 0, 0];
  const means = [0, 0, 0];
  for (const s of samples) {
    for (let i = 0; i < 3; i++) {
      means[i] = means[i]! + (s.v[i] ?? 0);
    }
  }
  for (let i = 0; i < 3; i++) means[i] = means[i]! / samples.length;
  for (const s of samples) {
    for (let i = 0; i < 3; i++) {
      const d = (s.v[i] ?? 0) - means[i]!;
      variances[i] = variances[i]! + d * d;
    }
  }
  return variances[0]! >= variances[1]! && variances[0]! >= variances[2]! ? 0
    : variances[1]! >= variances[2]! ? 1 : 2;
}

function zeroCrossings(values: readonly number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]!;
    const curr = values[i]!;
    if ((prev < 0 && curr >= 0) || (prev >= 0 && curr < 0)) {
      crossings.push(i);
    }
  }
  return crossings;
}

export function analyzePendulum(
  gyroSamples: readonly TimeSample[],
  inputs: PendulumInputs,
): PendulumResult {
  const resampled = resample(gyroSamples, 50);
  if (resampled.length < 10) {
    return { g: 0, periodS: 0, amplitudeRad: 0, cycleCount: 0 };
  }

  const axis = dominantAxis(resampled);
  const values = resampled.map((s) => s.v[axis] ?? 0);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const centered = values.map((v) => v - mean);

  const crossings = zeroCrossings(centered);
  if (crossings.length < 4) {
    return { g: 0, periodS: 0, amplitudeRad: 0, cycleCount: 0 };
  }

  const halfPeriods: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    const dt = (resampled[crossings[i]!]!.t - resampled[crossings[i - 1]!]!.t) / 1000;
    halfPeriods.push(dt);
  }

  const medianHalf = [...halfPeriods].sort((a, b) => a - b)[Math.floor(halfPeriods.length / 2)]!;
  const periodS = medianHalf * 2;
  const cycleCount = Math.floor(crossings.length / 2);

  let maxAbs = 0;
  for (const v of centered) {
    if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  }
  const amplitudeRad = maxAbs * periodS / (2 * Math.PI);

  const g = correctedG(inputs.lengthM, periodS, amplitudeRad, inputs.phoneHeightM);

  return { g, periodS, amplitudeRad, cycleCount };
}
