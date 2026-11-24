export interface ScrubState {
  readonly filteredAngle: number;
}

export function scrubIndex(
  rollDeg: number,
  n: number,
  state: ScrubState = { filteredAngle: 0 },
): { index: number; state: ScrubState } {
  if (n <= 1) {
    return { index: 0, state: { filteredAngle: 0 } };
  }

  // Dead zone of ±1.5 degrees around 0
  let effectiveAngle = rollDeg;
  if (Math.abs(effectiveAngle) < 1.5) {
    effectiveAngle = 0;
  }

  // Clamp angle to valid physical scrub range [-45°, +45°]
  const clampedAngle = Math.max(-45, Math.min(45, effectiveAngle));

  // Low-pass exponential moving average filter (alpha = 0.15)
  const filtered = 0.85 * state.filteredAngle + 0.15 * clampedAngle;

  // Normalized coordinate in [0, 1]
  const u = Math.max(0, Math.min(1, (filtered - -45) / 90));

  // Map to discrete buffer index [0, n - 1]
  const index = Math.round(u * (n - 1));

  return {
    index: Math.max(0, Math.min(n - 1, index)),
    state: { filteredAngle: filtered },
  };
}
