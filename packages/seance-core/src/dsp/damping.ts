export interface DampingEstimate {
  readonly decayRate: number;
  readonly halfLifeMs: number;
  readonly r2: number;
}

export function estimateDamping(
  peaks: ArrayLike<number>,
  tPeaksMs: ArrayLike<number>,
): DampingEstimate {
  const n = peaks.length;
  if (n < 2) {
    return { decayRate: 0, halfLifeMs: Infinity, r2: 0 };
  }

  const logAmps: number[] = [];
  const times: number[] = [];

  for (let i = 0; i < n; i++) {
    const amp = Math.abs(peaks[i]!);
    if (amp > 0) {
      logAmps.push(Math.log(amp));
      times.push(tPeaksMs[i]!);
    }
  }

  if (logAmps.length < 2) {
    return { decayRate: 0, halfLifeMs: Infinity, r2: 0 };
  }

  const { slope, r2 } = linearRegression(times, logAmps);

  const decayRate = -slope;
  const halfLifeMs = decayRate > 0 ? Math.LN2 / decayRate : Infinity;

  return { decayRate, halfLifeMs, r2 };
}

function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i]!;
    sumY += y[i]!;
    sumXY += x[i]! * y[i]!;
    sumX2 += x[i]! ** 2;
    sumY2 += y[i]! ** 2;
  }

  const denom = n * sumX2 - sumX ** 2;
  if (Math.abs(denom) < 1e-15) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = y.reduce((s, yi, i) => s + (yi - (slope * x[i]! + intercept)) ** 2, 0);
  const meanY = sumY / n;
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}
