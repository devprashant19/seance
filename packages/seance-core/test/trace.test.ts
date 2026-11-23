import { describe, expect, it } from "vitest";
import { createMockSpirit, signals } from "../src/transports/mock.js";
import { TraceRecorder } from "../src/trace-recorder.js";
import { createReplaySpirit } from "../src/transports/replay.js";
import { validateTrace } from "../src/trace.js";
import type { SampleBatch } from "../src/spirit.js";

function makeMock() {
  return createMockSpirit({
    seed: 99,
    clock: "manual",
    batchMs: 50,
    channels: [
      {
        id: "accel",
        unit: "m/s^2",
        axes: ["x", "y", "z"],
        nominalRateHz: 100,
        signals: [
          signals.sine(1, 9.81),
          signals.constant(0),
          signals.constant(9.81),
        ],
      },
      {
        id: "gyro",
        unit: "rad/s",
        axes: ["x", "y", "z"],
        nominalRateHz: 100,
        signals: [
          signals.constant(0),
          signals.constant(0),
          signals.dampedSine(0.5, 1, 0.3),
        ],
      },
    ],
  });
}

describe("TraceRecorder", () => {
  it("records batches into a valid GhostTrace", async () => {
    const spirit = makeMock();
    await spirit.summon();

    const recorder = new TraceRecorder(spirit);
    recorder.start();
    expect(recorder.recording).toBe(true);

    spirit.advance(500);

    const trace = recorder.stop();
    expect(recorder.recording).toBe(false);

    expect(trace.format).toBe("seance-trace");
    expect(trace.version).toBe(1);
    expect(trace.spiritId).toBe("mock-99");
    expect(trace.channels.length).toBe(2);

    const accelCh = trace.channels.find((c) => c.id === "accel")!;
    expect(accelCh.t.length).toBeGreaterThan(0);
    expect(accelCh.data.length).toBe(3);
    expect(accelCh.data[0]!.length).toBe(accelCh.t.length);

    expect(validateTrace(trace)).toBe(true);

    await spirit.banish();
  });

  it("records only specified channels", async () => {
    const spirit = makeMock();
    await spirit.summon();

    const recorder = new TraceRecorder(spirit);
    recorder.start(["gyro"]);

    spirit.advance(200);

    const trace = recorder.stop();
    expect(trace.channels.length).toBe(1);
    expect(trace.channels[0]!.id).toBe("gyro");

    await spirit.banish();
  });
});

describe("validateTrace", () => {
  it("rejects non-objects", () => {
    expect(validateTrace(null)).toBe(false);
    expect(validateTrace("string")).toBe(false);
    expect(validateTrace(42)).toBe(false);
  });

  it("rejects wrong format or version", () => {
    expect(validateTrace({ format: "other", version: 1 })).toBe(false);
    expect(validateTrace({ format: "seance-trace", version: 2 })).toBe(false);
  });

  it("accepts both seance and seance-trace formats", () => {
    const base = {
      version: 1,
      id: "test",
      channels: { accel: { unit: "m/s^2", axes: ["x"], t: [0], data: [[1]] } },
    };
    expect(validateTrace({ ...base, format: "seance" })).toBe(true);
    expect(validateTrace({ ...base, format: "seance-trace" })).toBe(true);
  });
});

describe("ReplaySpirit", () => {
  it("replays a trace and emits batches with matching data", async () => {
    const spirit = makeMock();
    await spirit.summon();

    const recorder = new TraceRecorder(spirit);
    recorder.start(["accel"]);
    spirit.advance(300);
    const trace = recorder.stop();
    await spirit.banish();

    const replay = createReplaySpirit(trace, { clock: "manual" });
    expect(replay.state).toBe("idle");
    expect(replay.transport).toBe("replay");

    await replay.summon();
    expect(replay.state).toBe("present");

    const batches: SampleBatch[] = [];
    const stream = replay.stream("accel");
    stream.subscribe((b) => batches.push(b));

    replay.advance(100);

    expect(batches.length).toBeGreaterThan(0);

    for (const batch of batches) {
      expect(batch.channel).toBe("accel");
      expect(batch.seq).toBeGreaterThan(0);
      for (const axis of batch.values) {
        for (let i = 0; i < axis.length; i++) {
          expect(Number.isFinite(axis[i])).toBe(true);
        }
      }
    }

    await replay.banish();
  });

  it("emits end event when trace is fully replayed", async () => {
    const spirit = makeMock();
    await spirit.summon();

    const recorder = new TraceRecorder(spirit);
    recorder.start(["accel"]);
    spirit.advance(100);
    const trace = recorder.stop();
    await spirit.banish();

    const replay = createReplaySpirit(trace, { clock: "manual" });
    await replay.summon();

    let ended = false;
    replay.on("end", () => {
      ended = true;
    });

    replay.advance(10000);

    expect(ended).toBe(true);
  });
});
