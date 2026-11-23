export interface TimingStats {
  readonly count: number;
  readonly meanHz: number;
  readonly meanIntervalMs: number;
  readonly medianIntervalMs: number;
  readonly p95IntervalMs: number;
  readonly maxIntervalMs: number;
  readonly jitterCv: number;
  readonly dropouts: number;
  readonly duplicates: number;
}

export function computeTimingStats(
  t: ArrayLike<number>,
  dropoutThresholdMs = 50,
): TimingStats {
  const n = t.length;
  if (n < 2) {
    return {
      count: n,
      meanHz: 0,
      meanIntervalMs: 0,
      medianIntervalMs: 0,
      p95IntervalMs: 0,
      maxIntervalMs: 0,
      jitterCv: 0,
      dropouts: 0,
      duplicates: 0,
    };
  }

  const intervals: number[] = [];
  let dropouts = 0;
  let duplicates = 0;

  for (let i = 1; i < n; i++) {
    const dt = t[i]! - t[i - 1]!;
    if (dt <= 0) {
      duplicates++;
      continue;
    }
    intervals.push(dt);
    if (dt > dropoutThresholdMs) {
      dropouts++;
    }
  }

  if (intervals.length === 0) {
    return {
      count: n,
      meanHz: 0,
      meanIntervalMs: 0,
      medianIntervalMs: 0,
      p95IntervalMs: 0,
      maxIntervalMs: 0,
      jitterCv: 0,
      dropouts,
      duplicates,
    };
  }

  const sorted = [...intervals].sort((a, b) => a - b);
  const sum = intervals.reduce((s, v) => s + v, 0);
  const mean = sum / intervals.length;
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
  const max = sorted[sorted.length - 1]!;

  const variance =
    intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
  const std = Math.sqrt(variance);
  const jitterCv = mean > 0 ? (std / mean) * 100 : 0;

  return {
    count: n,
    meanHz: mean > 0 ? 1000 / mean : 0,
    meanIntervalMs: mean,
    medianIntervalMs: median,
    p95IntervalMs: p95,
    maxIntervalMs: max,
    jitterCv,
    dropouts,
    duplicates,
  };
}
