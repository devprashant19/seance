/**
 * Modal analysis, multi-channel resonant decomposition, and coupled oscillators.
 */

import { realFftWithRate } from "./fft.js";

export interface ModalChannelResult {
  readonly id: string;
  readonly peakFrequencyHz: number;
  readonly amplitude: number;
  readonly relativeAmplitude: number; // A_k / max(A)
  readonly phaseDeg: number;
  readonly phaseUncertaintyDeg: number;
}

export interface ModalAnalysisResult {
  readonly sharedPeakFrequencyHz: number;
  readonly phaseUncertaintyDeg: number;
  readonly members: readonly ModalChannelResult[];
}

export interface CoupledBeatsResult {
  readonly f1Hz: number;
  readonly f2Hz: number;
  readonly beatFrequencyHz: number;
  readonly beatPeriodS: number;
  readonly meanFrequencyHz: number;
}

function applyHannWindow(v: readonly number[] | Float32Array): Float32Array {
  const n = v.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    out[i] = v[i]! * w;
  }
  return out;
}

function findPeak(magnitudes: Float32Array, frequencies: Float32Array): { freq: number; mag: number; idx: number } {
  let maxMag = -Infinity;
  let maxIdx = 0;
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i]! > maxMag) {
      maxMag = magnitudes[i]!;
      maxIdx = i;
    }
  }
  return {
    freq: frequencies[maxIdx] ?? 0,
    mag: maxMag,
    idx: maxIdx,
  };
}

export function analyzeModalFrequencies(
  memberSignals: readonly { id: string; values: readonly number[] | Float32Array; fs: number }[],
  skewMs = 5.0,
): ModalAnalysisResult {
  if (memberSignals.length === 0) {
    return { sharedPeakFrequencyHz: 0, phaseUncertaintyDeg: 0, members: [] };
  }

  const ffts = memberSignals.map((m) => {
    const windowed = applyHannWindow(m.values);
    return realFftWithRate(windowed, m.fs);
  });

  // Find shared peak: sum normalized power spectra
  const numBins = ffts[0]!.magnitudes.length;
  const sumPower = new Float32Array(numBins);

  for (const fft of ffts) {
    let totalMag = 0;
    for (let i = 0; i < numBins; i++) {
      totalMag += fft.magnitudes[i]!;
    }
    const norm = totalMag > 0 ? totalMag : 1;
    for (let i = 0; i < numBins; i++) {
      sumPower[i] = (sumPower[i] ?? 0) + (fft.magnitudes[i] ?? 0) / norm;
    }
  }

  const sharedPeak = findPeak(sumPower, ffts[0]!.frequencies);
  const sharedFreq = sharedPeak.freq;
  const phaseUncertainty = 360 * sharedFreq * (skewMs / 1000);

  // Measure amplitude and relative phase at shared frequency bin
  const peakIdx = sharedPeak.idx;
  let maxAmp = 0;
  const rawAmps: number[] = [];

  for (const fft of ffts) {
    const amp = fft.magnitudes[peakIdx] ?? 0;
    rawAmps.push(amp);
    if (amp > maxAmp) maxAmp = amp;
  }

  const members: ModalChannelResult[] = memberSignals.map((m, i) => {
    const amp = rawAmps[i]!;
    const relAmp = maxAmp > 0 ? amp / maxAmp : 0;
    
    // Direct Fourier phase calculation at sharedFreq
    const n = m.values.length;
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const angle = (2 * Math.PI * sharedFreq * j) / m.fs;
      re += m.values[j]! * Math.cos(angle);
      im -= m.values[j]! * Math.sin(angle);
    }
    const phaseRad = Math.atan2(im, re);
    const phaseDeg = (phaseRad * 180) / Math.PI;

    return {
      id: m.id,
      peakFrequencyHz: sharedFreq,
      amplitude: amp,
      relativeAmplitude: relAmp,
      phaseDeg,
      phaseUncertaintyDeg: phaseUncertainty,
    };
  });

  return {
    sharedPeakFrequencyHz: sharedFreq,
    phaseUncertaintyDeg: phaseUncertainty,
    members,
  };
}

export function analyzeCoupledBeats(
  sig1: readonly number[] | Float32Array,
  sig2: readonly number[] | Float32Array,
  fs: number,
): CoupledBeatsResult {
  const n = Math.min(sig1.length, sig2.length);
  const sumSig = new Float32Array(n);
  const diffSig = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    sumSig[i] = sig1[i]! + sig2[i]!;
    diffSig[i] = sig1[i]! - sig2[i]!;
  }

  const fftSum = realFftWithRate(applyHannWindow(sumSig), fs);
  const fftDiff = realFftWithRate(applyHannWindow(diffSig), fs);

  const peakSum = findPeak(fftSum.magnitudes, fftSum.frequencies);
  const peakDiff = findPeak(fftDiff.magnitudes, fftDiff.frequencies);

  const f1 = Math.min(peakSum.freq, peakDiff.freq);
  const f2 = Math.max(peakSum.freq, peakDiff.freq);
  const deltaF = Math.abs(f2 - f1);
  const beatPeriod = deltaF > 0 ? 1 / deltaF : 0;
  const meanF = (f1 + f2) / 2;

  return {
    f1Hz: f1,
    f2Hz: f2,
    beatFrequencyHz: deltaF,
    beatPeriodS: beatPeriod,
    meanFrequencyHz: meanF,
  };
}
