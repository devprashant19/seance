export type BiquadType = "lowpass" | "highpass" | "bandpass";

export interface BiquadCoeffs {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

export function designBiquad(
  type: BiquadType,
  sampleRateHz: number,
  cutoffHz: number,
  q = 0.707,
): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRateHz;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

  switch (type) {
    case "lowpass":
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    case "highpass":
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
    case "bandpass":
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
      break;
  }

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

export function applyBiquad(
  coeffs: BiquadCoeffs,
  input: ArrayLike<number>,
): Float32Array {
  const n = input.length;
  const output = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < n; i++) {
    const x0 = input[i]!;
    const y0 =
      coeffs.b0 * x0 +
      coeffs.b1 * x1 +
      coeffs.b2 * x2 -
      coeffs.a1 * y1 -
      coeffs.a2 * y2;
    output[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return output;
}
