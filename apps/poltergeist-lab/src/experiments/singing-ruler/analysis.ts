import { youngsModulusFromFrequency } from "./theory.js";

interface SpectrumFrame {
  readonly t: number;
  readonly frequencies: readonly number[];
  readonly magnitudes: readonly number[];
}

export interface SingingRulerResult {
  readonly E: number;
  readonly f1: number;
  readonly peakMagnitude: number;
}

function parabolicInterpolation(
  frequencies: readonly number[],
  magnitudes: readonly number[],
  peakIdx: number,
): number {
  if (peakIdx <= 0 || peakIdx >= magnitudes.length - 1) {
    return frequencies[peakIdx] ?? 0;
  }
  const alpha = magnitudes[peakIdx - 1] ?? 0;
  const beta = magnitudes[peakIdx] ?? 0;
  const gamma = magnitudes[peakIdx + 1] ?? 0;

  const denom = alpha - 2 * beta + gamma;
  if (Math.abs(denom) < 1e-12) return frequencies[peakIdx] ?? 0;

  const p = 0.5 * (alpha - gamma) / denom;
  const df = (frequencies[1] ?? 0) - (frequencies[0] ?? 0);
  return (frequencies[peakIdx] ?? 0) + p * df;
}

function findSpectralPeak(
  frames: readonly SpectrumFrame[],
  minFreq: number,
  maxFreq: number,
): { frequency: number; magnitude: number } {
  let bestFreq = 0;
  let bestMag = -Infinity;
  let bestIdx = 0;
  let bestFrame: SpectrumFrame | null = null;

  for (const frame of frames) {
    for (let i = 0; i < frame.magnitudes.length; i++) {
      const freq = frame.frequencies[i] ?? 0;
      const mag = frame.magnitudes[i] ?? 0;
      if (freq >= minFreq && freq <= maxFreq && mag > bestMag) {
        bestMag = mag;
        bestIdx = i;
        bestFreq = freq;
        bestFrame = frame;
      }
    }
  }

  if (bestFrame) {
    bestFreq = parabolicInterpolation(
      bestFrame.frequencies,
      bestFrame.magnitudes,
      bestIdx,
    );
  }

  return { frequency: bestFreq, magnitude: bestMag };
}

export function analyzeSingingRuler(
  spectrumFrames: readonly SpectrumFrame[],
  inputs: { thicknessM: number; lengthM: number; densityKgM3: number },
): SingingRulerResult {
  if (spectrumFrames.length === 0) {
    return { E: 0, f1: 0, peakMagnitude: 0 };
  }

  const peak = findSpectralPeak(spectrumFrames, 20, 2000);

  if (peak.frequency <= 0) {
    return { E: 0, f1: 0, peakMagnitude: 0 };
  }

  const E = youngsModulusFromFrequency(
    peak.frequency,
    inputs.thicknessM,
    inputs.lengthM,
    inputs.densityKgM3,
  );

  return { E, f1: peak.frequency, peakMagnitude: peak.magnitude };
}
