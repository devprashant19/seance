import { totalAccel, solvePosition } from "./theory.js";
import type { SpinEstimate } from "./uncertainty.js";

interface TimeSample {
  readonly t: number;
  readonly v: readonly number[];
}

interface AlignedSample {
  readonly t: number;
  readonly omegaX: number;
  readonly omegaY: number;
  readonly omegaZ: number;
  readonly ax: number;
  readonly ay: number;
}

export interface SpinAnalysisResult {
  readonly rx: number;
  readonly ry: number;
  readonly distance: number;
  readonly spinsUsed: number;
  readonly spinsRejected: number;
  readonly estimates: readonly SpinEstimate[];
  readonly fromTopMm: number;
  readonly fromLeftMm: number;
  readonly meanSpinRateHz: number;
}

function resampleToGrid(
  samples: readonly TimeSample[],
  targetHz: number,
  startMs: number,
  endMs: number,
): TimeSample[] {
  if (samples.length < 2) return [];
  const dt = 1000 / targetHz;
  const result: TimeSample[] = [];
  let si = 0;
  for (let t = startMs; t <= endMs; t += dt) {
    while (si < samples.length - 1 && samples[si + 1]!.t <= t) si++;
    const s0 = samples[si]!;
    if (si < samples.length - 1) {
      const s1 = samples[si + 1]!;
      const frac = (t - s0.t) / (s1.t - s0.t || 1);
      const v = s0.v.map((v0, i) => v0 + frac * ((s1.v[i] ?? 0) - v0));
      result.push({ t, v });
    } else {
      result.push({ t, v: [...s0.v] });
    }
  }
  return result;
}

function movingAverage(values: readonly number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      sum += values[j]!;
      count++;
    }
    return sum / count;
  });
}

function centralDiff(values: readonly number[], dtS: number): number[] {
  return values.map((_, i) => {
    if (i === 0) return (values[1]! - values[0]!) / dtS;
    if (i === values.length - 1) return (values[i]! - values[i - 1]!) / dtS;
    return (values[i + 1]! - values[i - 1]!) / (2 * dtS);
  });
}

function findSpinSegments(
  aligned: readonly AlignedSample[],
  minOmega: number,
  minSamples: number,
): AlignedSample[][] {
  const segments: AlignedSample[][] = [];
  let current: AlignedSample[] = [];

  for (const s of aligned) {
    if (Math.abs(s.omegaZ) >= minOmega) {
      current.push(s);
    } else {
      if (current.length >= minSamples) segments.push(current);
      current = [];
    }
  }
  if (current.length >= minSamples) segments.push(current);
  return segments;
}

function isWobbling(segment: readonly AlignedSample[]): boolean {
  let wobbleCount = 0;
  for (const s of segment) {
    const outOfPlane = Math.sqrt(s.omegaX ** 2 + s.omegaY ** 2);
    if (outOfPlane > 0.20 * Math.abs(s.omegaZ)) wobbleCount++;
  }
  return wobbleCount / segment.length > 0.30;
}

function isSaturated(segment: readonly AlignedSample[]): boolean {
  let run = 1;
  for (let i = 1; i < segment.length; i++) {
    if (segment[i]!.omegaZ === segment[i - 1]!.omegaZ) {
      run++;
      if (run > 10) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

function solveSpinLSQ(
  segment: readonly AlignedSample[],
  alphas: readonly number[],
  startIdx: number,
): SpinEstimate {
  let ata00 = 0, ata01 = 0, ata11 = 0;
  let atb0 = 0, atb1 = 0;
  let omegaSum = 0;

  for (let k = 0; k < segment.length; k++) {
    const s = segment[k]!;
    const w = s.omegaZ;
    const w2 = w * w;
    const a = alphas[startIdx + k] ?? 0;

    const a11 = -w2;
    const a12 = -a;
    const a21 = a;
    const a22 = -w2;

    ata00 += a11 * a11 + a21 * a21;
    ata01 += a11 * a12 + a21 * a22;
    ata11 += a12 * a12 + a22 * a22;

    atb0 += a11 * s.ax + a21 * s.ay;
    atb1 += a12 * s.ax + a22 * s.ay;

    omegaSum += Math.abs(w);
  }

  const det = ata00 * ata11 - ata01 * ata01;
  if (Math.abs(det) < 1e-20) {
    return { rx: 0, ry: 0, stdErrRx: Infinity, stdErrRy: Infinity, meanOmega: omegaSum / segment.length, sampleCount: segment.length };
  }

  const invDet = 1 / det;
  const rx = (ata11 * atb0 - ata01 * atb1) * invDet;
  const ry = (-ata01 * atb0 + ata00 * atb1) * invDet;

  let residualSum = 0;
  for (let k = 0; k < segment.length; k++) {
    const s = segment[k]!;
    const a = alphas[startIdx + k] ?? 0;
    const [predAx, predAy] = totalAccel(s.omegaZ, a, rx, ry);
    residualSum += (s.ax - predAx) ** 2 + (s.ay - predAy) ** 2;
  }

  const n = segment.length;
  const sigma2 = n > 2 ? residualSum / (2 * n - 2) : residualSum / Math.max(1, 2 * n);

  const stdErrRx = Math.sqrt(sigma2 * Math.abs(ata11 * invDet));
  const stdErrRy = Math.sqrt(sigma2 * Math.abs(ata00 * invDet));

  return {
    rx,
    ry,
    stdErrRx,
    stdErrRy,
    meanOmega: omegaSum / n,
    sampleCount: n,
  };
}

export function analyzeSpinFindChip(
  gyroSamples: readonly TimeSample[],
  accelSamples: readonly TimeSample[],
  phoneWidth: number,
  phoneHeight: number,
): SpinAnalysisResult {
  const empty: SpinAnalysisResult = {
    rx: 0, ry: 0, distance: 0, spinsUsed: 0, spinsRejected: 0,
    estimates: [], fromTopMm: 0, fromLeftMm: 0, meanSpinRateHz: 0,
  };

  if (gyroSamples.length < 10 || accelSamples.length < 10) return empty;

  const tStart = Math.max(gyroSamples[0]!.t, accelSamples[0]!.t);
  const tEnd = Math.min(
    gyroSamples[gyroSamples.length - 1]!.t,
    accelSamples[accelSamples.length - 1]!.t,
  );

  const RATE = 100;
  const gyroResampled = resampleToGrid(gyroSamples, RATE, tStart, tEnd);
  const accelResampled = resampleToGrid(accelSamples, RATE, tStart, tEnd);

  const len = Math.min(gyroResampled.length, accelResampled.length);
  if (len < 200) return empty;

  const biasWindow = Math.min(200, len);
  let biasAx = 0, biasAy = 0;
  let biasCount = 0;
  for (let i = 0; i < biasWindow; i++) {
    const g = gyroResampled[i]!;
    const totalOmega = Math.sqrt((g.v[0] ?? 0) ** 2 + (g.v[1] ?? 0) ** 2 + (g.v[2] ?? 0) ** 2);
    if (totalOmega < 0.02) {
      biasAx += accelResampled[i]!.v[0] ?? 0;
      biasAy += accelResampled[i]!.v[1] ?? 0;
      biasCount++;
    }
  }
  if (biasCount > 0) {
    biasAx /= biasCount;
    biasAy /= biasCount;
  }

  const aligned: AlignedSample[] = [];
  for (let i = 0; i < len; i++) {
    const g = gyroResampled[i]!;
    const a = accelResampled[i]!;
    aligned.push({
      t: g.t,
      omegaX: g.v[0] ?? 0,
      omegaY: g.v[1] ?? 0,
      omegaZ: g.v[2] ?? 0,
      ax: (a.v[0] ?? 0) - biasAx,
      ay: (a.v[1] ?? 0) - biasAy,
    });
  }

  const rawOmegaZ = aligned.map((s) => s.omegaZ);
  const filteredOmegaZ = movingAverage(rawOmegaZ, 5);
  const dtS = 1 / RATE;
  const alphas = centralDiff(filteredOmegaZ, dtS);

  const alignedWithFiltered = aligned.map((s, i) => ({
    ...s,
    omegaZ: filteredOmegaZ[i]!,
  }));

  const MIN_OMEGA = 6;
  const MIN_SAMPLES = 100;
  const segments = findSpinSegments(alignedWithFiltered, MIN_OMEGA, MIN_SAMPLES);

  const estimates: SpinEstimate[] = [];
  let rejected = 0;

  let segStart = 0;
  for (const seg of segments) {
    const startIdx = alignedWithFiltered.indexOf(seg[0]!);
    if (isWobbling(seg)) { rejected++; continue; }
    if (isSaturated(seg)) { rejected++; continue; }
    const est = solveSpinLSQ(seg, alphas, startIdx >= 0 ? startIdx : segStart);
    estimates.push(est);
    segStart += seg.length;
  }

  if (estimates.length === 0) return { ...empty, spinsRejected: rejected };

  if (estimates.length >= 3) {
    const medRx = [...estimates].sort((a, b) => a.rx - b.rx)[Math.floor(estimates.length / 2)]!.rx;
    const medRy = [...estimates].sort((a, b) => a.ry - b.ry)[Math.floor(estimates.length / 2)]!.ry;
    const dists = estimates.map((e) => Math.sqrt((e.rx - medRx) ** 2 + (e.ry - medRy) ** 2));
    const meanDist = dists.reduce((a, b) => a + b, 0) / dists.length;
    const stdDist = Math.sqrt(dists.reduce((s, d) => s + (d - meanDist) ** 2, 0) / dists.length);
    const threshold = meanDist + 3 * stdDist;
    const filtered = estimates.filter((_, i) => dists[i]! <= threshold);
    if (filtered.length > 0) {
      const finalEstimates = filtered;
      const rx = finalEstimates.reduce((s, e) => s + e.rx, 0) / finalEstimates.length;
      const ry = finalEstimates.reduce((s, e) => s + e.ry, 0) / finalEstimates.length;
      const distance = Math.sqrt(rx ** 2 + ry ** 2);
      const fromLeft = (phoneWidth / 2 + rx) * 1000;
      const fromTop = (phoneHeight / 2 - ry) * 1000;
      const meanRate = finalEstimates.reduce((s, e) => s + Math.abs(e.meanOmega), 0) / finalEstimates.length / (2 * Math.PI);

      return {
        rx, ry, distance,
        spinsUsed: finalEstimates.length,
        spinsRejected: rejected + estimates.length - finalEstimates.length,
        estimates: finalEstimates,
        fromTopMm: fromTop,
        fromLeftMm: fromLeft,
        meanSpinRateHz: meanRate,
      };
    }
  }

  const rx = estimates.reduce((s, e) => s + e.rx, 0) / estimates.length;
  const ry = estimates.reduce((s, e) => s + e.ry, 0) / estimates.length;
  const distance = Math.sqrt(rx ** 2 + ry ** 2);
  const fromLeft = (phoneWidth / 2 + rx) * 1000;
  const fromTop = (phoneHeight / 2 - ry) * 1000;
  const meanRate = estimates.reduce((s, e) => s + Math.abs(e.meanOmega), 0) / estimates.length / (2 * Math.PI);

  return {
    rx, ry, distance,
    spinsUsed: estimates.length,
    spinsRejected: rejected,
    estimates,
    fromTopMm: fromTop,
    fromLeftMm: fromLeft,
    meanSpinRateHz: meanRate,
  };
}
