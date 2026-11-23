export interface LinearFit {
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number;
}

export function linearFit(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
): LinearFit {
  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? y[0]! : 0, r2: 0 };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i]!;
    sumY += y[i]!;
    sumXY += x[i]! * y[i]!;
    sumX2 += x[i]! ** 2;
  }

  const denom = n * sumX2 - sumX ** 2;
  if (Math.abs(denom) < 1e-15) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  let ssRes = 0, ssTot = 0;
  const meanY = sumY / n;
  for (let i = 0; i < n; i++) {
    ssRes += (y[i]! - (slope * x[i]! + intercept)) ** 2;
    ssTot += (y[i]! - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}
