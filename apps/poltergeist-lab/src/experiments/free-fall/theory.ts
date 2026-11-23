const G_STANDARD = 9.81;

export function heightFromFallTime(t: number, g = G_STANDARD): number {
  return 0.5 * g * t ** 2;
}

export function fallTimeFromHeight(h: number, g = G_STANDARD): number {
  return Math.sqrt((2 * h) / g);
}
