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
  /** Standard uncertainty of the period (s), from the scatter of the timed periods. */
  readonly periodUncS: number;
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
  const empty = { g: 0, periodS: 0, periodUncS: 0, amplitudeRad: 0, cycleCount: 0 };
  if (gyroSamples.length < 10) return empty;

  const axis = dominantAxis(gyroSamples);
  const values = gyroSamples.map((s) => s.v[axis] ?? 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const centered = values.map((v) => v - mean);
  let maxAbs = 0;
  for (const v of centered) maxAbs = Math.max(maxAbs, Math.abs(v));
  if (maxAbs === 0) return empty;

  // Upward zero crossings with hysteresis (ignores sensor noise around zero), each located by
  // linear interpolation between the two raw samples that straddle zero.
  const h = 0.2 * maxAbs;
  const ups: number[] = [];
  let armed = centered[0]! < -h;
  for (let i = 1; i < centered.length; i++) {
    const v = centered[i]!;
    if (v < -h) armed = true;
    if (armed && v > h) {
      armed = false;
      let j = i;
      while (j > 0 && centered[j - 1]! > 0) j--;
      if (j === 0) continue;
      const a0 = centered[j - 1]!, a1 = centered[j]!;
      const t0 = gyroSamples[j - 1]!.t, t1 = gyroSamples[j]!.t;
      ups.push(t0 + ((0 - a0) / (a1 - a0 || 1)) * (t1 - t0));
    }
  }
  if (ups.length < 2) return empty;

  const periods: number[] = [];
  for (let i = 1; i < ups.length; i++) periods.push((ups[i]! - ups[i - 1]!) / 1000);
  const periodS = (ups[ups.length - 1]! - ups[0]!) / 1000 / periods.length;
  const sd = periods.length > 1
    ? Math.sqrt(periods.reduce((s, x) => s + (x - periodS) ** 2, 0) / (periods.length - 1))
    : 0;
  // Each crossing time is known to roughly a tenth of a sample interval after interpolation.
  const dtS = (gyroSamples[gyroSamples.length - 1]!.t - gyroSamples[0]!.t) / 1000 / (gyroSamples.length - 1);
  const crossingTerm = (Math.SQRT2 * 0.1 * dtS) / periods.length;
  const periodUncS = Math.max(periods.length > 1 ? sd / Math.sqrt(periods.length) : 0, crossingTerm);

  const amplitudeRad = (maxAbs * periodS) / (2 * Math.PI);
  const g = correctedG(inputs.lengthM, periodS, amplitudeRad, inputs.phoneHeightM);
  return { g, periodS, periodUncS, amplitudeRad, cycleCount: periods.length };
}
