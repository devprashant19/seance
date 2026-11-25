/**
 * Pure conversion from browser sensor events to phone-bridge channels (canonical units).
 * Kept DOM-free so it can be unit-tested and reused by every phone page.
 *
 * Units at the edge (conventions): rotationRate deg/s → gyro rad/s; orientation deg → rad;
 * accelerationIncludingGravity → `accelG` (m/s²); acceleration (gravity removed) → `accel` (m/s²).
 */

export const DEG_TO_RAD = Math.PI / 180;

export interface MotionSample {
  readonly t: number;
  readonly accelG: readonly [number, number, number];
  readonly accel: readonly [number, number, number];
  /** rad/s about device x, y, z */
  readonly gyro: readonly [number, number, number];
}

export interface OrientationSample {
  readonly t: number;
  /** alpha, beta, gamma in radians */
  readonly angles: readonly [number, number, number];
}

/** Choir touch pad: x, y in 0–1 across the pad; down = 1 while touched (channel `control.touch`). */
export interface TouchSample {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly down: boolean;
}

type Xyz = { x?: number | null; y?: number | null; z?: number | null } | null | undefined;
type Abg = { alpha?: number | null; beta?: number | null; gamma?: number | null } | null | undefined;

const n = (v: number | null | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** DeviceMotionEvent fields → MotionSample. rotationRate: alpha = about z, beta = about x, gamma = about y. */
export function motionSample(t: number, accelerationIncludingGravity: Xyz, acceleration: Xyz, rotationRate: Abg): MotionSample {
  return {
    t,
    accelG: [n(accelerationIncludingGravity?.x), n(accelerationIncludingGravity?.y), n(accelerationIncludingGravity?.z)],
    accel: [n(acceleration?.x), n(acceleration?.y), n(acceleration?.z)],
    gyro: [n(rotationRate?.beta) * DEG_TO_RAD, n(rotationRate?.gamma) * DEG_TO_RAD, n(rotationRate?.alpha) * DEG_TO_RAD],
  };
}

/** DeviceOrientationEvent fields (degrees) → OrientationSample (radians). */
export function orientationSample(t: number, alphaDeg: number | null, betaDeg: number | null, gammaDeg: number | null): OrientationSample {
  return { t, angles: [n(alphaDeg) * DEG_TO_RAD, n(betaDeg) * DEG_TO_RAD, n(gammaDeg) * DEG_TO_RAD] };
}

export type ChannelArrays = Record<string, { t: Float64Array; values: Float32Array[] }>;

function columns<T>(samples: readonly T[], pick: (s: T) => readonly number[], time: (s: T) => number, axes: number) {
  const t = new Float64Array(samples.length);
  const values = Array.from({ length: axes }, () => new Float32Array(samples.length));
  samples.forEach((s, i) => {
    t[i] = time(s);
    const v = pick(s);
    for (let a = 0; a < axes; a++) values[a]![i] = v[a] ?? 0;
  });
  return { t, values };
}

/** Buffered samples → channel arrays ready for `encodeBatch`. Empty buffers produce no channel. */
export function buildPhoneChannels(
  motion: readonly MotionSample[],
  orientation: readonly OrientationSample[],
  touch: readonly TouchSample[] = [],
): ChannelArrays {
  const out: ChannelArrays = {};
  if (touch.length > 0) {
    out["control.touch"] = columns(touch, (s) => [s.x, s.y, s.down ? 1 : 0], (s) => s.t, 3);
  }
  if (motion.length > 0) {
    out["accelG"] = columns(motion, (s) => s.accelG, (s) => s.t, 3);
    out["accel"] = columns(motion, (s) => s.accel, (s) => s.t, 3);
    out["gyro"] = columns(motion, (s) => s.gyro, (s) => s.t, 3);
  }
  if (orientation.length > 0) {
    out["orientation"] = columns(orientation, (s) => s.angles, (s) => s.t, 3);
  }
  return out;
}

/** Decoded channel → `{t, v[]}` samples, the shape experiments' `analyze()` consumes. */
export function toTimeSamples(ch: { t: Float64Array; values: Float32Array[] }): { t: number; v: number[] }[] {
  const out: { t: number; v: number[] }[] = [];
  for (let i = 0; i < ch.t.length; i++) out.push({ t: ch.t[i]!, v: ch.values.map((axis) => axis[i]!) });
  return out;
}
