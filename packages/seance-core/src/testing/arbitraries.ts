import fc from "fast-check";
import type { Quantity, Unit } from "../units.js";
import { q } from "../units.js";

export const arbUnit: fc.Arbitrary<Unit> = fc.constantFrom(
  "m",
  "s",
  "ms",
  "Hz",
  "rad",
  "deg",
  "rad/s",
  "m/s^2",
  "kg/m^3",
  "Pa",
  "GPa",
  "dBFS",
  "px",
  "degC",
  "K",
  "1/s",
  "1",
);

export function arbQuantity<U extends Unit>(
  unit: U,
  opts?: { min?: number; max?: number },
): fc.Arbitrary<Quantity<U>> {
  const min = opts?.min ?? -1e6;
  const max = opts?.max ?? 1e6;
  return fc
    .double({ noNaN: true, noDefaultInfinity: true, min, max })
    .map((v) => q(v, unit));
}

export const arbAccelAxis: fc.Arbitrary<Quantity<"m/s^2">> = arbQuantity(
  "m/s^2",
  { min: -20, max: 20 },
);

export const arbGyroAxis: fc.Arbitrary<Quantity<"rad/s">> = arbQuantity(
  "rad/s",
  { min: -10, max: 10 },
);

export const arbOrientationDeg: fc.Arbitrary<Quantity<"deg">> = arbQuantity(
  "deg",
  { min: -180, max: 360 },
);

export const arbOrientationRad: fc.Arbitrary<Quantity<"rad">> = arbQuantity(
  "rad",
  { min: -Math.PI, max: 2 * Math.PI },
);

export const arbFrequencyHz: fc.Arbitrary<Quantity<"Hz">> = arbQuantity("Hz", {
  min: 0.1,
  max: 48000,
});

export const arbTimestampMs: fc.Arbitrary<Quantity<"ms">> = arbQuantity("ms", {
  min: 0,
  max: 60000,
});

export function arbTimeSeries(
  length: number,
  intervalMs: number,
  jitterFraction: number,
): fc.Arbitrary<Float64Array> {
  return fc
    .array(
      fc.double({
        noNaN: true,
        noDefaultInfinity: true,
        min: -jitterFraction,
        max: jitterFraction,
      }),
      { minLength: length, maxLength: length },
    )
    .map((jitters) => {
      const t = new Float64Array(length);
      let now = 0;
      for (let i = 0; i < length; i++) {
        t[i] = now;
        now += intervalMs * (1 + (jitters[i] ?? 0));
      }
      return t;
    });
}

export function arbSensorValues(
  length: number,
  mean: number,
  std: number,
): fc.Arbitrary<Float32Array> {
  return fc
    .array(
      fc.double({
        noNaN: true,
        noDefaultInfinity: true,
        min: mean - 4 * std,
        max: mean + 4 * std,
      }),
      { minLength: length, maxLength: length },
    )
    .map((vals) => new Float32Array(vals));
}
