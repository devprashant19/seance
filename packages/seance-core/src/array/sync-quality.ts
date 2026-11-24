/**
 * Clock synchronization quality estimator and skew bounds.
 */

export interface SyncQualityReport {
  readonly minRttMs: number;
  readonly meanRttMs: number;
  readonly rttSpreadMs: number;
  readonly estimatedSkewBoundMs: number;
  readonly isSynchronized: boolean;
}

export function estimateSyncSkewBound(rttSamplesMs: readonly number[]): SyncQualityReport {
  const n = rttSamplesMs.length;
  if (n === 0) {
    return {
      minRttMs: 0,
      meanRttMs: 0,
      rttSpreadMs: 0,
      estimatedSkewBoundMs: 5.0, // default conservative 5ms
      isSynchronized: false,
    };
  }

  let minRtt = Infinity;
  let maxRtt = -Infinity;
  let sum = 0;

  for (const rtt of rttSamplesMs) {
    if (rtt < minRtt) minRtt = rtt;
    if (rtt > maxRtt) maxRtt = rtt;
    sum += rtt;
  }

  const meanRtt = sum / n;
  const spread = maxRtt - minRtt;
  // Physical invariant: skew uncertainty is at least half the min RTT
  const skewBound = Math.max(0.2, minRtt / 2);

  return {
    minRttMs: minRtt,
    meanRttMs: meanRtt,
    rttSpreadMs: spread,
    estimatedSkewBoundMs: skewBound,
    isSynchronized: skewBound < 50,
  };
}
