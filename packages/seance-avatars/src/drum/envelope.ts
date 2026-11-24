/**
 * Pure min/max envelope downsampling for canvas seismograph rendering.
 */

export interface EnvelopeBucket {
  readonly pixelX: number;
  readonly tMs: number;
  readonly min: number;
  readonly max: number;
  readonly isGap: boolean;
}

export function downsampleEnvelope(
  t: readonly number[] | Float64Array,
  v: readonly number[] | Float32Array,
  widthPx: number,
  zoomSecondsPerPx = 0.02,
  gapThresholdMs?: number,
): EnvelopeBucket[] {
  const n = Math.min(t.length, v.length);
  if (n === 0 || widthPx <= 0) return [];

  // Compute median dt if threshold not provided
  let threshold = gapThresholdMs;
  if (threshold === undefined && n >= 2) {
    const dtArr: number[] = [];
    for (let i = 0; i < Math.min(n - 1, 100); i++) {
      dtArr.push(t[i + 1]! - t[i]!);
    }
    dtArr.sort((a, b) => a - b);
    const medDt = dtArr[Math.floor(dtArr.length / 2)] ?? 20;
    threshold = 3 * medDt;
  }
  const maxGap = threshold ?? 60;

  const msPerPx = zoomSecondsPerPx * 1000;
  const tEnd = t[n - 1]!;
  const tStart = Math.max(t[0]!, tEnd - widthPx * msPerPx);

  const buckets: EnvelopeBucket[] = [];
  let sampleIdx = 0;

  // Advance to first visible sample
  while (sampleIdx < n && t[sampleIdx]! < tStart) {
    sampleIdx++;
  }

  for (let px = 0; px < widthPx; px++) {
    const bucketStartT = tStart + px * msPerPx;
    const bucketEndT = bucketStartT + msPerPx;

    let bucketMin = Infinity;
    let bucketMax = -Infinity;
    let hasSamples = false;
    let midT = (bucketStartT + bucketEndT) / 2;
    let hasGap = false;

    let prevSampleT = sampleIdx > 0 ? t[sampleIdx - 1]! : bucketStartT;

    while (sampleIdx < n && t[sampleIdx]! < bucketEndT) {
      const curT = t[sampleIdx]!;
      const curV = v[sampleIdx]!;

      if (curT - prevSampleT > maxGap) {
        hasGap = true;
      }
      prevSampleT = curT;

      if (curV < bucketMin) bucketMin = curV;
      if (curV > bucketMax) bucketMax = curV;
      hasSamples = true;
      sampleIdx++;
    }

    if (hasSamples) {
      buckets.push({
        pixelX: px,
        tMs: midT,
        min: bucketMin,
        max: bucketMax,
        isGap: hasGap,
      });
    }
  }

  return buckets;
}
