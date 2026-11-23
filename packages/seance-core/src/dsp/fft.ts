export function realFft(
  input: ArrayLike<number>,
): { magnitudes: Float32Array; frequencies: Float32Array; sampleRateHz: number } & {
  peakHz: number;
  peakMagnitude: number;
} {
  const n = nextPow2(input.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);

  for (let i = 0; i < input.length; i++) {
    re[i] = input[i]!;
  }

  fftInPlace(re, im, false);

  const halfN = n / 2;
  const magnitudes = new Float32Array(halfN);
  const frequencies = new Float32Array(halfN);

  let peakIdx = 0;
  let peakMag = 0;

  for (let i = 0; i < halfN; i++) {
    magnitudes[i] = Math.sqrt(re[i]! ** 2 + im[i]! ** 2) / n;
    frequencies[i] = i;

    if (i > 0 && magnitudes[i]! > peakMag) {
      peakMag = magnitudes[i]!;
      peakIdx = i;
    }
  }

  let peakHz = peakIdx;
  let peakMagnitude = peakMag;

  if (peakIdx > 0 && peakIdx < halfN - 1) {
    const alpha = magnitudes[peakIdx - 1]!;
    const beta = magnitudes[peakIdx]!;
    const gamma = magnitudes[peakIdx + 1]!;
    const denom = alpha - 2 * beta + gamma;
    if (Math.abs(denom) > 1e-12) {
      const p = 0.5 * (alpha - gamma) / denom;
      peakHz = peakIdx + p;
      peakMagnitude = beta - 0.25 * (alpha - gamma) * p;
    }
  }

  return { magnitudes, frequencies, sampleRateHz: n, peakHz, peakMagnitude };
}

export function realFftWithRate(
  input: ArrayLike<number>,
  sampleRateHz: number,
): ReturnType<typeof realFft> {
  const result = realFft(input);
  const n = nextPow2(input.length);

  for (let i = 0; i < result.frequencies.length; i++) {
    result.frequencies[i] = (i * sampleRateHz) / n;
  }

  const peakHz = (result.peakHz * sampleRateHz) / n;

  return { ...result, sampleRateHz, peakHz };
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function fftInPlace(
  re: Float64Array,
  im: Float64Array,
  inverse: boolean,
): void {
  const n = re.length;
  const bits = Math.log2(n);

  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angle = (2 * Math.PI) / size * (inverse ? -1 : 1);

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const wRe = Math.cos(angle * j);
        const wIm = Math.sin(angle * j);

        const idx = i + j;
        const idx2 = idx + halfSize;

        const tRe = wRe * re[idx2]! - wIm * im[idx2]!;
        const tIm = wRe * im[idx2]! + wIm * re[idx2]!;

        re[idx2] = re[idx]! - tRe;
        im[idx2] = im[idx]! - tIm;
        re[idx] = re[idx]! + tRe;
        im[idx] = im[idx]! + tIm;
      }
    }
  }
}

function bitReverse(x: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}
