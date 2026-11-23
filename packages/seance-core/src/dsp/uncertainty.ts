export interface UncertainValue {
  readonly value: number;
  readonly uncertainty: number;
  readonly relative: number;
}

export function meanWithUncertainty(
  values: ArrayLike<number>,
): UncertainValue {
  const n = values.length;
  if (n === 0) return { value: 0, uncertainty: 0, relative: 0 };
  if (n === 1) return { value: values[0]!, uncertainty: 0, relative: 0 };

  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i]!;
  const mean = sum / n;

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) sumSqDiff += (values[i]! - mean) ** 2;
  const stdErr = Math.sqrt(sumSqDiff / (n * (n - 1)));

  return {
    value: mean,
    uncertainty: stdErr,
    relative: mean !== 0 ? Math.abs(stdErr / mean) * 100 : 0,
  };
}

export function propagateAdd(a: UncertainValue, b: UncertainValue): UncertainValue {
  const value = a.value + b.value;
  const uncertainty = Math.sqrt(a.uncertainty ** 2 + b.uncertainty ** 2);
  return {
    value,
    uncertainty,
    relative: value !== 0 ? Math.abs(uncertainty / value) * 100 : 0,
  };
}

export function propagateMultiply(a: UncertainValue, b: UncertainValue): UncertainValue {
  const value = a.value * b.value;
  const relA = a.value !== 0 ? a.uncertainty / Math.abs(a.value) : 0;
  const relB = b.value !== 0 ? b.uncertainty / Math.abs(b.value) : 0;
  const uncertainty = Math.abs(value) * Math.sqrt(relA ** 2 + relB ** 2);
  return {
    value,
    uncertainty,
    relative: value !== 0 ? Math.abs(uncertainty / value) * 100 : 0,
  };
}
