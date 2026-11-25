import { describe, expect, it } from "vitest";
import { buildPhoneChannels, encodeBatch, decodeBatch, motionSample, orientationSample } from "seance-core/transports/phone-bridge";
import { sensorFrameFromBatch } from "../src/live/frames.js";

function wire(channels: ReturnType<typeof buildPhoneChannels>) {
  return decodeBatch(JSON.parse(JSON.stringify(encodeBatch(1, channels))));
}

describe("sensorFrameFromBatch", () => {
  it("uses the latest orientation (radians) and gravity-free accel", () => {
    const batch = wire(
      buildPhoneChannels(
        [motionSample(1, { z: 9.8 }, { x: 0, y: 0, z: 0 }, null), motionSample(2, { z: 9.8 }, { x: 3, y: 0, z: 4 }, null)],
        [orientationSample(1, 0, 10, 0), orientationSample(2, 0, 30, -20)],
      ),
    );
    const f = sensorFrameFromBatch(batch)!;
    expect(f.orientation!.beta).toBeCloseTo((30 * Math.PI) / 180, 5);
    expect(f.orientation!.gamma).toBeCloseTo((-20 * Math.PI) / 180, 5);
    expect(f.accel).toEqual({ x: 3, y: 0, z: 4 });
  });

  it("maps the touch pad to touch.down", () => {
    const down = sensorFrameFromBatch(wire(buildPhoneChannels([], [], [{ t: 1, x: 0.5, y: 0.5, down: true }])))!;
    const up = sensorFrameFromBatch(wire(buildPhoneChannels([], [], [{ t: 2, x: 0, y: 0, down: false }])))!;
    expect(down.touch?.down).toBe(true);
    expect(up.touch?.down).toBe(false);
  });

  it("returns null for a batch with nothing the voice uses", () => {
    expect(sensorFrameFromBatch({ seq: 1, channels: {} })).toBeNull();
  });
});
