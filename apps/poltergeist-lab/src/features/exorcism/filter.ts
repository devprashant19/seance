export interface FilterResult {
  readonly filtered: readonly number[];
  readonly residual: readonly number[];
  readonly rmsRaw: number;
  readonly rmsFiltered: number;
  readonly rmsRemoved: number;
}

interface BiquadCoeffs {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

function butterworthCoeffs(sampleRateHz: number, cutoffHz: number): BiquadCoeffs {
  const wc = Math.tan(Math.PI * cutoffHz / sampleRateHz);
  const wc2 = wc * wc;
  const sqrt2 = Math.SQRT2;
  const norm = 1 / (1 + sqrt2 * wc + wc2);

  return {
    b0: wc2 * norm,
    b1: 2 * wc2 * norm,
    b2: wc2 * norm,
    a1: 2 * (wc2 - 1) * norm,
    a2: (1 - sqrt2 * wc + wc2) * norm,
  };
}

function applyBiquad(signal: readonly number[], c: BiquadCoeffs): number[] {
  const out = new Array<number>(signal.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let i = 0; i < signal.length; i++) {
    const x0 = signal[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return out;
}

function rms(arr: readonly number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v * v;
  return Math.sqrt(sum / arr.length);
}

export function butterworthLowpass(
  signal: readonly number[],
  sampleRateHz: number,
  cutoffHz: number,
): FilterResult {
  if (signal.length < 3 || cutoffHz <= 0 || cutoffHz >= sampleRateHz / 2) {
    return {
      filtered: signal,
      residual: signal.map(() => 0),
      rmsRaw: rms(signal),
      rmsFiltered: rms(signal),
      rmsRemoved: 0,
    };
  }

  const coeffs = butterworthCoeffs(sampleRateHz, cutoffHz);

  const forward = applyBiquad(signal, coeffs);

  const reversed = [...forward].reverse();
  const backFiltered = applyBiquad(reversed, coeffs);
  const filtered = backFiltered.reverse();

  const residual = signal.map((v, i) => v - filtered[i]!);

  return {
    filtered,
    residual,
    rmsRaw: rms(signal),
    rmsFiltered: rms(filtered),
    rmsRemoved: rms(residual),
  };
}

export function sliderToCutoff(s: number, fMin: number, fMax: number): number {
  const clamped = Math.max(0, Math.min(1, s));
  const logMin = Math.log(fMin);
  const logMax = Math.log(fMax);
  return Math.exp(logMax + clamped * (logMin - logMax));
}

export function attenuationAtFreq(
  cutoffHz: number,
  signalFreqHz: number,
): { amplitudeReductionPct: number; phaseLagMs: number } {
  if (cutoffHz <= 0 || signalFreqHz <= 0) {
    return { amplitudeReductionPct: 0, phaseLagMs: 0 };
  }

  const ratio = signalFreqHz / cutoffHz;
  const magnitude = 1 / Math.sqrt(1 + ratio ** 4);
  const amplitudeReductionPct = (1 - magnitude) * 100;

  const phaseRad = -Math.atan2(Math.SQRT2 * ratio, 1 - ratio * ratio);
  const phaseLagMs = signalFreqHz > 0
    ? Math.abs(phaseRad) / (2 * Math.PI * signalFreqHz) * 1000
    : 0;

  return { amplitudeReductionPct, phaseLagMs };
}

export function detectSignalFrequency(
  signal: readonly number[],
  sampleRateHz: number,
): number {
  if (signal.length < 4) return 0;

  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const centered = signal.map((v) => v - mean);

  const crossings: number[] = [];
  for (let i = 1; i < centered.length; i++) {
    const prev = centered[i - 1]!;
    const curr = centered[i]!;
    if ((prev < 0 && curr >= 0) || (prev >= 0 && curr < 0)) {
      crossings.push(i);
    }
  }

  if (crossings.length < 2) return 0;

  const halfPeriodSamples: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    halfPeriodSamples.push(crossings[i]! - crossings[i - 1]!);
  }

  const sorted = [...halfPeriodSamples].sort((a, b) => a - b);
  const medianHalf = sorted[Math.floor(sorted.length / 2)]!;
  const periodSamples = medianHalf * 2;

  return periodSamples > 0 ? sampleRateHz / periodSamples : 0;
}
