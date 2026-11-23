export function linearResample(
  tIn: ArrayLike<number>,
  values: ArrayLike<number>,
  targetRateHz: number,
  gapThresholdMs = 100,
): { t: Float64Array; values: Float32Array } {
  const n = tIn.length;
  if (n === 0) {
    return { t: new Float64Array(0), values: new Float32Array(0) };
  }
  if (n === 1) {
    return {
      t: Float64Array.of(tIn[0]!),
      values: Float32Array.of(values[0]!),
    };
  }

  const tStart = tIn[0]!;
  const tEnd = tIn[n - 1]!;
  const stepMs = 1000 / targetRateHz;
  const totalSamples = Math.floor((tEnd - tStart) / stepMs) + 1;

  const tOut = new Float64Array(totalSamples);
  const vOut = new Float32Array(totalSamples);

  let srcIdx = 0;
  for (let i = 0; i < totalSamples; i++) {
    const tTarget = tStart + i * stepMs;
    tOut[i] = tTarget;

    while (srcIdx < n - 1 && tIn[srcIdx + 1]! < tTarget) {
      srcIdx++;
    }

    const t0 = tIn[srcIdx]!;
    const t1 = tIn[srcIdx + 1] ?? t0;
    const gap = t1 - t0;

    if (gap > gapThresholdMs || gap <= 0) {
      vOut[i] = NaN;
    } else {
      const frac = gap > 0 ? (tTarget - t0) / gap : 0;
      const v0 = values[srcIdx]!;
      const v1 = values[srcIdx + 1] ?? v0;
      vOut[i] = v0 + frac * (v1 - v0);
    }
  }

  return { t: tOut, values: vOut };
}
