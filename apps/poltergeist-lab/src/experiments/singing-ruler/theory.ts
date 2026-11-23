const BETA_1 = 3.516;

export function cantileverFrequency(
  E: number,
  h: number,
  L: number,
  rho: number,
): number {
  return (BETA_1 / (2 * Math.PI * L ** 2)) * Math.sqrt((E * h ** 2) / (12 * rho));
}

export function youngsModulusFromFrequency(
  f1: number,
  h: number,
  L: number,
  rho: number,
): number {
  return (48 * Math.PI ** 2 * rho * L ** 4 * f1 ** 2) / (BETA_1 ** 2 * h ** 2);
}
