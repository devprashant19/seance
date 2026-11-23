export function formatNumber(value: number, sigFigs: number): string {
  if (!Number.isFinite(value) || sigFigs < 1) return String(value);

  const absVal = Math.abs(value);
  if (absVal === 0) return "0";

  const magnitude = Math.floor(Math.log10(absVal));
  const decimalPlaces = Math.max(0, sigFigs - 1 - magnitude);

  if (magnitude >= sigFigs || magnitude < -3) {
    return value.toExponential(sigFigs - 1);
  }

  return value.toFixed(decimalPlaces);
}

export function formatMeasured(
  value: number,
  uncertainty: number,
  unit: string,
): string {
  if (!Number.isFinite(value) || !Number.isFinite(uncertainty) || uncertainty <= 0) {
    return `${value} ${unit}`;
  }

  const uncMagnitude = Math.floor(Math.log10(Math.abs(uncertainty)));
  const uncSigFigs = leadingDigit(uncertainty) >= 3 ? 1 : 2;
  const uncDecimalPlaces = Math.max(0, uncSigFigs - 1 - uncMagnitude);

  const roundedUnc = roundToDecimal(uncertainty, uncDecimalPlaces);
  const roundedVal = roundToDecimal(value, uncDecimalPlaces);

  const formattedVal = roundedVal.toFixed(uncDecimalPlaces);
  const formattedUnc = roundedUnc.toFixed(uncDecimalPlaces);

  return `${formattedVal} ± ${formattedUnc} ${unit}`;
}

function leadingDigit(n: number): number {
  const abs = Math.abs(n);
  if (abs === 0) return 0;
  const mag = Math.floor(Math.log10(abs));
  return Math.floor(abs / 10 ** mag);
}

function roundToDecimal(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}
