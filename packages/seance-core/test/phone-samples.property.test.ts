import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { encodeBatch, decodeBatch } from "../src/transports/phone-bridge/protocol.js";
import { buildPhoneChannels, motionSample, orientationSample, toTimeSamples, DEG_TO_RAD } from "../src/transports/phone-bridge/phone-samples.js";

describe("phone batch conversion", () => {
  it("converts rotationRate deg/s → rad/s with alpha→z, beta→x, gamma→y", () => {
    const s = motionSample(10, { x: 0, y: 0, z: 9.81 }, { x: 0.1, y: 0, z: 0 }, { alpha: 90, beta: 180, gamma: -45 });
    expect(s.gyro[0]).toBeCloseTo(Math.PI, 9); // beta → x
    expect(s.gyro[1]).toBeCloseTo(-Math.PI / 4, 9); // gamma → y
    expect(s.gyro[2]).toBeCloseTo(Math.PI / 2, 9); // alpha → z
    expect(s.accelG).toEqual([0, 0, 9.81]);
  });

  it("converts orientation degrees → radians and tolerates null fields", () => {
    const o = orientationSample(5, 180, null, 90);
    expect(o.angles[0]).toBeCloseTo(Math.PI, 9);
    expect(o.angles[1]).toBe(0);
    expect(o.angles[2]).toBeCloseTo(Math.PI / 2, 9);
  });

  it("produces no channel for empty buffers", () => {
    expect(buildPhoneChannels([], [])).toEqual({});
  });

  it("encodes the Choir touch pad as control.touch = [x, y, down]", () => {
    const ch = buildPhoneChannels([], [], [{ t: 1, x: 0.25, y: 0.75, down: true }, { t: 2, x: 0, y: 0, down: false }]);
    const samples = toTimeSamples(ch["control.touch"]!);
    expect(samples[0]!.v).toEqual([0.25, 0.75, 1]);
    expect(samples[1]!.v[2]).toBe(0);
  });

  it("property: phone samples survive encodeBatch → JSON → decodeBatch (what the relay carries)", () => {
    const deg = fc.double({ min: -360, max: 360, noNaN: true });
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.double({ min: 0, max: 1e7, noNaN: true }), deg, deg, deg, fc.double({ min: -40, max: 40, noNaN: true })), { minLength: 1, maxLength: 40 }),
        (rows) => {
          const motion = rows.map(([t, a, b, g, z]) => motionSample(t, { x: 0, y: 0, z }, null, { alpha: a, beta: b, gamma: g }));
          const orient = rows.map(([t, a, b, g]) => orientationSample(t, a, b, g));
          const wire = JSON.parse(JSON.stringify(encodeBatch(7, buildPhoneChannels(motion, orient))));
          const decoded = decodeBatch(wire);
          const gyro = toTimeSamples(decoded.channels["gyro"]!);
          const ori = toTimeSamples(decoded.channels["orientation"]!);
          return (
            decoded.seq === 7 &&
            gyro.length === rows.length &&
            rows.every(([, a, b, g], i) =>
              Math.abs(gyro[i]!.v[0]! - b * DEG_TO_RAD) < 1e-5 &&
              Math.abs(gyro[i]!.v[2]! - a * DEG_TO_RAD) < 1e-5 &&
              Math.abs(ori[i]!.v[2]! - g * DEG_TO_RAD) < 1e-5,
            )
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
