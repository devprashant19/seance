import { realFftWithRate } from "./fft.js";

export interface RollingShutterFlickerReport {
  readonly dominantSpatialCycles: number;
  readonly modulationDepthPct: number;
  readonly isFlickerDetected: boolean;
  readonly qualitative: true;
  readonly explanation: string;
}

/**
 * Computes average horizontal row luminance from an image pixel buffer.
 */
export function computeRowLuminances(
  pixels: Uint8ClampedArray | readonly number[],
  width: number,
  height: number,
): number[] {
  if (width <= 0 || height <= 0 || pixels.length === 0) return [];

  const rowMeans: number[] = new Array(height);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = pixels[idx] ?? 0;
      const g = pixels[idx + 1] ?? 0;
      const b = pixels[idx + 2] ?? 0;
      rowSum += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    rowMeans[y] = rowSum / width;
  }

  return rowMeans;
}

/**
 * Analyzes rolling-shutter spatial banding from row luminances using spatial FFT.
 * Returns qualitative flicker diagnostic.
 */
export function analyzeRollingShutterFlicker(
  rowLuminances: readonly number[],
): RollingShutterFlickerReport {
  const h = rowLuminances.length;
  if (h < 16) {
    return {
      dominantSpatialCycles: 0,
      modulationDepthPct: 0,
      isFlickerDetected: false,
      qualitative: true,
      explanation: "Insufficient row data to evaluate spatial flicker bands.",
    };
  }

  // Mean brightness across rows
  let meanLum = 0;
  for (let i = 0; i < h; i++) meanLum += rowLuminances[i]!;
  meanLum /= h;

  // Subtract DC to analyze spatial ripples
  const zeroMeanRows = rowLuminances.map((v) => v - meanLum);

  // Compute spatial FFT treating h as the "sampling rate" so frequency = cycles per frame
  const fft = realFftWithRate(zeroMeanRows, h);

  let maxPeakMag = 0;
  let dominantCycles = 0;

  // Look for peaks between 1 and h/2 cycles/frame
  for (let i = 1; i < fft.magnitudes.length; i++) {
    const mag = fft.magnitudes[i] ?? 0;
    const cycles = fft.frequencies[i] ?? 0;
    if (mag > maxPeakMag && cycles >= 1) {
      maxPeakMag = mag;
      dominantCycles = cycles;
    }
  }

  const modulationDepthPct = meanLum > 0 ? (maxPeakMag / meanLum) * 100 : 0;
  const isFlickerDetected = modulationDepthPct > 5.0 && dominantCycles >= 1.5;

  let explanation: string;
  if (isFlickerDetected) {
    explanation = `Qualitative detection: Periodic horizontal dark/bright bands (~${dominantCycles.toFixed(1)} cycles/frame, depth ~${modulationDepthPct.toFixed(1)}%) observed across the CMOS rolling shutter. This indicates rapid temporal flicker from 50/60 Hz mains lighting or pulse-width modulated (PWM) LED drivers, which can cause unconscious eye strain, headaches, and feelings of tension.`;
  } else {
    explanation =
      "Qualitative assessment: No significant rolling-shutter luminance banding detected. Indoor illumination is steady (incandescent, high-frequency ballast, or natural daylight).";
  }

  return {
    dominantSpatialCycles: dominantCycles,
    modulationDepthPct,
    isFlickerDetected,
    qualitative: true,
    explanation,
  };
}
