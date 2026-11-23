const TWO_PI = 2 * Math.PI;

export function period(L: number, g: number): number {
  return TWO_PI * Math.sqrt(L / g);
}

export function gFromPeriod(L: number, T: number): number {
  return (4 * Math.PI ** 2 * L) / (T ** 2);
}

export function finiteAmplitudeCorrection(theta0Rad: number): number {
  return 1 + (1 / 16) * theta0Rad ** 2;
}

export function effectiveLength(L: number, hPhone: number): number {
  return L + (1 / 12) * (hPhone ** 2 / L);
}

export function correctedG(
  L: number,
  T: number,
  theta0Rad: number,
  hPhone: number,
): number {
  const Leff = effectiveLength(L, hPhone);
  const Tcorr = T / finiteAmplitudeCorrection(theta0Rad);
  return gFromPeriod(Leff, Tcorr);
}
