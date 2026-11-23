export interface ZeroCrossing {
  readonly index: number;
  readonly tMs: number;
  readonly direction: "rising" | "falling";
}

export function detectZeroCrossings(
  values: ArrayLike<number>,
  t: ArrayLike<number>,
  hysteresis = 0.01,
): ZeroCrossing[] {
  const crossings: ZeroCrossing[] = [];
  let armed = true;
  let lastSign = Math.sign(values[0]!);

  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    const sign = Math.sign(v);

    if (sign !== 0 && sign !== lastSign) {
      if (armed && Math.abs(v) > hysteresis) {
        const v0 = values[i - 1]!;
        const t0 = t[i - 1]!;
        const t1 = t[i]!;
        const frac = Math.abs(v0) / (Math.abs(v0) + Math.abs(v));
        const tCross = t0 + frac * (t1 - t0);

        crossings.push({
          index: i,
          tMs: tCross,
          direction: v > 0 ? "rising" : "falling",
        });
        armed = false;
      }
    }

    if (Math.abs(v) > hysteresis) {
      armed = true;
      lastSign = sign;
    }
  }

  return crossings;
}

export interface FreeFallWindow {
  readonly startIdx: number;
  readonly endIdx: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly meanAccel: number;
}

export function detectFreeFall(
  accelMag: ArrayLike<number>,
  t: ArrayLike<number>,
  thresholdMps2 = 2.0,
  minDurationMs = 100,
): FreeFallWindow[] {
  const windows: FreeFallWindow[] = [];
  let start = -1;

  for (let i = 0; i < accelMag.length; i++) {
    const below = accelMag[i]! < thresholdMps2;

    if (below && start === -1) {
      start = i;
    } else if (!below && start !== -1) {
      const dur = t[i - 1]! - t[start]!;
      if (dur >= minDurationMs) {
        let sum = 0;
        for (let j = start; j < i; j++) sum += accelMag[j]!;
        windows.push({
          startIdx: start,
          endIdx: i - 1,
          startMs: t[start]!,
          endMs: t[i - 1]!,
          durationMs: dur,
          meanAccel: sum / (i - start),
        });
      }
      start = -1;
    }
  }

  if (start !== -1) {
    const end = accelMag.length - 1;
    const dur = t[end]! - t[start]!;
    if (dur >= minDurationMs) {
      let sum = 0;
      for (let j = start; j <= end; j++) sum += accelMag[j]!;
      windows.push({
        startIdx: start,
        endIdx: end,
        startMs: t[start]!,
        endMs: t[end]!,
        durationMs: dur,
        meanAccel: sum / (end - start + 1),
      });
    }
  }

  return windows;
}
