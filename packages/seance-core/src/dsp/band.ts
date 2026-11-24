import { designBiquad, applyBiquad } from "./filters.js";

export interface VibrationBandReport {
  readonly filtered: Float32Array | readonly number[];
  readonly bandEnergyRms: number;
  readonly baselineEnergy: number;
  readonly energyRatio: number;
  readonly isElevated: boolean;
  readonly peakHz?: number;
  readonly explanation: string;
}

/**
 * Filters a sensor signal to the 1–20 Hz infrasound and building vibration band
 * using cascaded biquad highpass and lowpass filters.
 */
export function filterInfrasoundBand(signal: readonly number[] | ArrayLike<number>, sampleRateHz: number): Float32Array {
  if (signal.length === 0 || sampleRateHz <= 0) return new Float32Array(0);

  const nyquist = sampleRateHz / 2;
  const highpassCutoff = Math.min(1.0, nyquist * 0.1);
  const lowpassCutoff = Math.min(20.0, nyquist * 0.9);

  // Highpass at 1 Hz
  const hpCoeffs = designBiquad("highpass", sampleRateHz, highpassCutoff, 0.707);
  const hpSignal = applyBiquad(hpCoeffs, signal);

  // Lowpass at 20 Hz
  const lpCoeffs = designBiquad("lowpass", sampleRateHz, lowpassCutoff, 0.707);
  return applyBiquad(lpCoeffs, hpSignal);
}

/**
 * Computes root-mean-square (RMS) energy of a signal: sqrt(sum(x^2) / N).
 */
export function computeRmsEnergy(signal: readonly number[] | ArrayLike<number>): number {
  const n = signal.length;
  if (n === 0) return 0;

  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const val = signal[i]!;
    sumSq += val * val;
  }

  return Math.sqrt(sumSq / n);
}

/**
 * Analyzes floor vibrations in the 1–20 Hz infrasonic structural band against a quiescent baseline.
 */
export function analyzeVibrationBand(
  signal: readonly number[],
  sampleRateHz: number,
  baselineEnergy = 0.05,
): VibrationBandReport {
  const filtered = filterInfrasoundBand(signal, sampleRateHz);
  const bandEnergyRms = computeRmsEnergy(filtered);
  const safeBaseline = Math.max(1e-4, baselineEnergy);
  const energyRatio = bandEnergyRms / safeBaseline;
  const isElevated = energyRatio > 2.0;

  let explanation: string;
  if (isElevated) {
    explanation =
      "Elevated 1–20 Hz vibrations detected. Low-frequency structural vibrations (HVAC ducts, nearby heavy traffic, or machinery) near 18–19 Hz can induce ocular resonance (eyeball vibration) leading to blurred peripheral vision and heightened nervous arousal.";
  } else {
    explanation =
      "Infrasonic structural vibration levels are within normal ambient baseline (< 2x baseline). No abnormal resonance detected.";
  }

  return {
    filtered,
    bandEnergyRms,
    baselineEnergy: safeBaseline,
    energyRatio,
    isElevated,
    explanation,
  };
}
