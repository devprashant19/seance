import { median, mad } from "../dsp/robust.js";

export interface TeamResult {
  readonly teamId: string;
  readonly teamName: string;
  readonly value: number;
  readonly uncertainty: number;
  readonly timestamp: number;
  readonly station?: string;
  readonly notes?: string;
}

export interface ClassStatistics {
  readonly count: number;
  readonly mean: number;
  readonly sampleStdDev: number;
  readonly median: number;
  readonly mad: number;
  readonly weightedMean: number;
  readonly weightedUncertainty: number;
  readonly outlierTeamIds: readonly string[];
}

/**
 * Computes classroom aggregate statistics including median, MAD, sample standard deviation,
 * and inverse-variance weighted mean and uncertainty.
 */
export function computeClassStats(results: readonly TeamResult[]): ClassStatistics {
  const n = results.length;
  if (n === 0) {
    return {
      count: 0,
      mean: 0,
      sampleStdDev: 0,
      median: 0,
      mad: 0,
      weightedMean: 0,
      weightedUncertainty: 0,
      outlierTeamIds: [],
    };
  }

  const values = results.map((r) => r.value);
  const med = median(values);
  const m = mad(values);

  // Mean
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i]!;
  const mean = sum / n;

  // Sample standard deviation (Bessel's correction n-1)
  let ssq = 0;
  for (let i = 0; i < n; i++) {
    const diff = values[i]! - mean;
    ssq += diff * diff;
  }
  const sampleStdDev = n > 1 ? Math.sqrt(ssq / (n - 1)) : 0;

  // Inverse-variance weighting
  let sumWeights = 0;
  let sumWeightedVals = 0;

  for (let i = 0; i < n; i++) {
    const sigma = Math.max(1e-6, results[i]!.uncertainty);
    const w = 1 / (sigma * sigma);
    sumWeights += w;
    sumWeightedVals += w * results[i]!.value;
  }

  const weightedMean = sumWeights > 0 ? sumWeightedVals / sumWeights : mean;
  const weightedUncertainty = sumWeights > 0 ? 1 / Math.sqrt(sumWeights) : 0;

  // Outlier detection: |x - median| > 3 * MAD (non-censored)
  const outlierTeamIds: string[] = [];
  if (m > 0) {
    const threshold = 3 * m;
    for (const r of results) {
      if (Math.abs(r.value - med) > threshold) {
        outlierTeamIds.push(r.teamId);
      }
    }
  }

  return {
    count: n,
    mean,
    sampleStdDev,
    median: med,
    mad: m,
    weightedMean,
    weightedUncertainty,
    outlierTeamIds,
  };
}
