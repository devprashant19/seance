export function centrifugalAccel(omega: number, r: number): number {
  return -omega * omega * r;
}

export function tangentialAccel(alpha: number, rx: number, ry: number): [number, number] {
  return [-alpha * ry, alpha * rx];
}

export function totalAccel(
  omega: number,
  alpha: number,
  rx: number,
  ry: number,
): [number, number] {
  const ax = -omega * omega * rx - alpha * ry;
  const ay = alpha * rx - omega * omega * ry;
  return [ax, ay];
}

export function solvePosition(
  omega: number,
  alpha: number,
  ax: number,
  ay: number,
): [number, number] {
  const w2 = omega * omega;
  const denom = w2 * w2 + alpha * alpha;
  if (denom < 1e-12) return [0, 0];
  const rx = (-w2 * ax + alpha * ay) / denom;
  const ry = (-alpha * ax - w2 * ay) / denom;
  return [rx, ry];
}

export function steadyStatePosition(
  omega: number,
  ax: number,
  ay: number,
): [number, number] {
  const w2 = omega * omega;
  if (w2 < 1e-12) return [0, 0];
  return [-ax / w2, -ay / w2];
}

export interface EdgeDistances {
  readonly fromTopMm: number;
  readonly fromLeftMm: number;
}

export function distanceFromEdges(
  rx: number,
  ry: number,
  phoneWidth: number,
  phoneHeight: number,
): EdgeDistances {
  const fromLeft = (phoneWidth / 2 + rx) * 1000;
  const fromTop = (phoneHeight / 2 - ry) * 1000;
  return { fromTopMm: fromTop, fromLeftMm: fromLeft };
}
