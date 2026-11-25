import { describe, it, expect } from "vitest";
import { peakShake, ShakeTrigger, SHAKE_THRESHOLD } from "../src/live/shake.js";

type Batch = Parameters<typeof peakShake>[0];

function batch(channel: "accel" | "accelG", samples: [number, number, number][]): Batch {
  return {
    seq: 1,
    channels: {
      [channel]: {
        t: Float64Array.from(samples.map((_, i) => i * 20)),
        values: [0, 1, 2].map((axis) => Float32Array.from(samples.map((s) => s[axis]!))),
      },
    },
  };
}

describe("shake detection", () => {
  it("uses the gravity-free accel channel when present", () => {
    expect(peakShake(batch("accel", [[0, 0, 1], [3, 4, 0], [0, 0, 2]]))).toBeCloseTo(5, 5);
  });

  it("falls back to accelG minus 1 g", () => {
    expect(peakShake(batch("accelG", [[0, 0, 9.81]]))).toBeCloseTo(0, 2);
    expect(peakShake(batch("accelG", [[0, 0, 29.81]]))).toBeCloseTo(20, 2);
  });

  it("is zero without motion channels", () => {
    expect(peakShake({ seq: 1, channels: {} })).toBe(0);
  });

  it("fires once per shake and waits for the dizzy animation to finish", () => {
    const trigger = new ShakeTrigger(SHAKE_THRESHOLD, 3200);
    const hard = batch("accel", [[20, 0, 0]]);
    const calm = batch("accel", [[1, 0, 0]]);
    expect(trigger.feed(calm, 0)).toBe(false);
    expect(trigger.feed(hard, 100)).toBe(true);
    expect(trigger.feed(hard, 1_000)).toBe(false); // still dizzy
    expect(trigger.feed(hard, 3_400)).toBe(true);
  });
});
