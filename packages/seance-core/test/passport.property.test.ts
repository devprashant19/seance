import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeChannelPassportStats,
  createDevicePassport,
  comparePassportWithBaseline,
  queryDeviceCapabilities,
  type DevicePassport,
  type DevicePassportBaseline,
} from "../src/passport/index.js";
import type { GhostTrace } from "../src/trace.js";

describe("Passport Property Tests", () => {
  it("Property 1: capability reporting is valid and non-throwing", () => {
    const caps = queryDeviceCapabilities();
    expect(caps.availableChannels.length).toBeGreaterThan(0);
    expect(typeof caps.isSecureContext).toBe("boolean");
    expect(typeof caps.isMobile).toBe("boolean");
  });

  it("Property 2: sampling stats are strictly invariant to constant time shifts", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 10, max: 50, noNaN: true }), { minLength: 10, maxLength: 100 }),
        fc.double({ min: -10000, max: 10000, noNaN: true }),
        (intervals, shift) => {
          let t1 = 1000;
          const tArr1: number[] = [t1];
          for (const dt of intervals) {
            t1 += dt;
            tArr1.push(t1);
          }
          const tArr2 = tArr1.map((t) => t + shift);
          const data = [new Array(tArr1.length).fill(1.0)];

          const stats1 = computeChannelPassportStats(tArr1, data, "test");
          const stats2 = computeChannelPassportStats(tArr2, data, "test");

          expect(Math.abs(stats1.fsHz - stats2.fsHz)).toBeLessThan(1e-4);
          expect(Math.abs(stats1.jitterCvPercent - stats2.jitterCvPercent)).toBeLessThan(1e-4);
          expect(stats1.dropoutCount).toBe(stats2.dropoutCount);
        },
      ),
    );
  });

  it("Property 3: fs and jitterCV are non-negative and finite", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 5, max: 100, noNaN: true }), { minLength: 5, maxLength: 50 }),
        (intervals) => {
          let t = 0;
          const tArr: number[] = [t];
          for (const dt of intervals) {
            t += dt;
            tArr.push(t);
          }
          const data = [new Array(tArr.length).fill(0)];
          const stats = computeChannelPassportStats(tArr, data, "accel");

          expect(stats.fsHz).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(stats.fsHz)).toBe(true);
          expect(stats.jitterCvPercent).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(stats.jitterCvPercent)).toBe(true);
          expect(stats.dropoutCount).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("Property 4: comparing passport against identical baseline yields zero diff and pass", () => {
    const mockTrace: GhostTrace = {
      format: "seance",
      version: 1,
      id: "trace-p4",
      device: { model: "iPhone 15 Pro", platform: "iOS" },
      channels: [
        {
          id: "accelG",
          unit: "m/s^2",
          axes: ["x", "y", "z"],
          t: [0, 16.6, 33.3, 50.0, 66.6, 83.3, 100.0, 116.6],
          data: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81],
          ],
        },
      ],
    };

    const passport = createDevicePassport(mockTrace);
    const baseline: DevicePassportBaseline = {
      deviceModel: passport.model,
      tolerances: {
        accelG: {
          minFsHz: 50,
          maxJitterCvPercent: 20,
          maxDropouts: 0,
        },
      },
      baselineStats: {
        accelG: {
          fsHz: passport.channels["accelG"]!.fsHz,
          jitterCvPercent: passport.channels["accelG"]!.jitterCvPercent,
          dropoutCount: passport.channels["accelG"]!.dropoutCount,
        },
      },
    };

    const verdict = comparePassportWithBaseline(passport, baseline);
    expect(verdict.verdict).toBe("pass");
    expect(verdict.channelDiffs["accelG"]!.fsDiffHz).toBe(0);
    expect(verdict.channelDiffs["accelG"]!.jitterCvDiffPercent).toBe(0);
  });
});
