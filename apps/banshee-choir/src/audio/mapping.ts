const PITCH_MIN_RAD = -Math.PI / 4;
const PITCH_MAX_RAD = Math.PI / 4;
const CUTOFF_MIN_HZ = 200;
const CUTOFF_MAX_HZ = 5000;
const TREMOLO_THRESHOLD = 1.5;
const TREMOLO_MAX_ACCEL = 20;
const TREMOLO_MAX_DEPTH = 0.8;
const TREMOLO_MAX_RATE = 8;

export function tiltToPitch(betaRad: number, _pitchRangeSemitones = 24): number {
  const clamped = Math.max(PITCH_MIN_RAD, Math.min(PITCH_MAX_RAD, betaRad));
  return (clamped - PITCH_MIN_RAD) / (PITCH_MAX_RAD - PITCH_MIN_RAD);
}

export function rollToCutoff(gammaRad: number): number {
  const clamped = Math.max(PITCH_MIN_RAD, Math.min(PITCH_MAX_RAD, gammaRad));
  const norm = (clamped - PITCH_MIN_RAD) / (PITCH_MAX_RAD - PITCH_MIN_RAD);
  return CUTOFF_MIN_HZ + norm * (CUTOFF_MAX_HZ - CUTOFF_MIN_HZ);
}

export function shakeToTremolo(accelMag: number): { depth: number; rate: number } {
  if (accelMag < TREMOLO_THRESHOLD) {
    return { depth: 0, rate: 0 };
  }
  const norm = Math.min(1, (accelMag - TREMOLO_THRESHOLD) / (TREMOLO_MAX_ACCEL - TREMOLO_THRESHOLD));
  return {
    depth: norm * TREMOLO_MAX_DEPTH,
    rate: norm * TREMOLO_MAX_RATE,
  };
}
