/**
 * Shared spectrum helpers for experiments that look for resonant peaks in one phone's trace.
 * Phones deliver samples at slightly irregular times, so traces are first resampled onto a uniform
 * grid; peaks are then found in a Hann-windowed FFT and compared with the noise floor.
 */
import { realFftWithRate } from "seance-core";

export interface Sample {
  readonly t: number;
  readonly v: readonly number[];
}

export interface UniformTrace {
  readonly values: Float64Array;
  /** Samples per second. */
  readonly fs: number;
  /** Duration in seconds. */
  readonly durationS: number;
}

/** Linear-interpolate one component of `samples` onto a uniform grid at the median sample rate. */
export function resampleUniform(samples: readonly Sample[], pick: (v: readonly number[]) => number): UniformTrace {
  if (samples.length < 8) return { values: new Float64Array(0), fs: 0, durationS: 0 };
  const dts: number[] = [];
  for (let i = 1; i < samples.length; i++) dts.push(samples[i]!.t - samples[i - 1]!.t);
  dts.sort((a, b) => a - b);
  const medianDt = dts[Math.floor(dts.length / 2)]!;
  if (!(medianDt > 0)) return { values: new Float64Array(0), fs: 0, durationS: 0 };
  const t0 = samples[0]!.t;
  const t1 = samples[samples.length - 1]!.t;
  const n = Math.floor((t1 - t0) / medianDt) + 1;
  const values = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * medianDt;
    while (j < samples.length - 2 && samples[j + 1]!.t < t) j++;
    const a = samples[j]!;
    const b = samples[j + 1] ?? a;
    const span = b.t - a.t;
    const f = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
    values[i] = pick(a.v) * (1 - f) + pick(b.v) * f;
  }
  return { values, fs: 1000 / medianDt, durationS: (t1 - t0) / 1000 };
}

export interface Peak {
  readonly hz: number;
  readonly magnitude: number;
}

export interface Spectrum {
  readonly peaks: readonly Peak[];
  /** Median magnitude in the searched band: the noise floor. */
  readonly noiseFloor: number;
  /** Frequency resolution of the recording (1 / duration), in Hz. */
  readonly resolutionHz: number;
}

/** Local maxima of the (mean-removed, Hann-windowed) spectrum within [minHz, maxHz], strongest first. */
export function spectrumPeaks(trace: UniformTrace, minHz: number, maxHz: number): Spectrum {
  const n = trace.values.length;
  if (n < 8 || trace.fs <= 0) return { peaks: [], noiseFloor: 0, resolutionHz: Infinity };
  let mean = 0;
  for (const v of trace.values) mean += v;
  mean /= n;
  const windowed = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    windowed[i] = (trace.values[i]! - mean) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  const { magnitudes, frequencies } = realFftWithRate(windowed, trace.fs);
  const band: number[] = [];
  const peaks: Peak[] = [];
  for (let i = 1; i < magnitudes.length - 1; i++) {
    const f = frequencies[i]!;
    if (f < minHz || f > maxHz) continue;
    const m = magnitudes[i]!;
    band.push(m);
    if (m > magnitudes[i - 1]! && m >= magnitudes[i + 1]!) {
      // Parabolic interpolation between bins for a sub-bin frequency estimate.
      const a = magnitudes[i - 1]!;
      const c = magnitudes[i + 1]!;
      const denom = a - 2 * m + c;
      const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      const binHz = (frequencies[1] ?? 0) - (frequencies[0] ?? 0);
      peaks.push({ hz: f + shift * binHz, magnitude: m });
    }
  }
  band.sort((x, y) => x - y);
  const noiseFloor = band.length ? band[Math.floor(band.length / 2)]! : 0;
  peaks.sort((x, y) => y.magnitude - x.magnitude);
  return { peaks, noiseFloor, resolutionHz: 1 / Math.max(trace.durationS, 1e-6) };
}
