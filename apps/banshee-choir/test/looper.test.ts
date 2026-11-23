import { describe, it, expect } from "vitest";
import { createBarClock } from "../src/looper/clock.js";
import { createMotionRecorder } from "../src/looper/recorder.js";
import { createLoopScheduler } from "../src/looper/scheduler.js";

describe("BarClock", () => {
  it("computes bar length from BPM", () => {
    const clock = createBarClock(120, 0);
    expect(clock.barLengthS).toBeCloseTo(2.0, 6);
  });

  it("currentBeat cycles through 0-3 in 4/4", () => {
    const clock = createBarClock(120, 0);
    const beatDur = 0.5;
    expect(clock.currentBeat(0)).toBe(0);
    expect(clock.currentBeat(beatDur * 1)).toBe(1);
    expect(clock.currentBeat(beatDur * 2)).toBe(2);
    expect(clock.currentBeat(beatDur * 3)).toBe(3);
    expect(clock.currentBeat(beatDur * 4)).toBe(0);
  });

  it("nextBarStart returns correct boundary", () => {
    const clock = createBarClock(120, 0);
    expect(clock.nextBarStart(0.5)).toBeCloseTo(2.0, 6);
    expect(clock.nextBarStart(2.5)).toBeCloseTo(4.0, 6);
  });

  it("clamps BPM to 60-160 range", () => {
    const clock = createBarClock(30, 0);
    expect(clock.bpm).toBe(60);
    clock.setBpm(200);
    expect(clock.bpm).toBe(160);
  });
});

describe("MotionRecorder", () => {
  it("transitions idle -> armed -> recording -> done", () => {
    const clock = createBarClock(120, 0);
    const recorder = createMotionRecorder(clock);

    expect(recorder.state).toBe("idle");

    recorder.arm(1);
    expect(recorder.state).toBe("armed");

    // Simulate ticking just before bar boundary
    recorder.tick(1.995);
    expect(recorder.state).toBe("recording");

    recorder.record({ t: 2.0, pitch: 0.5, cutoff: 1000, gate: true });
    recorder.record({ t: 2.5, pitch: 0.6, cutoff: 1200, gate: true });

    // Tick past the 1-bar duration (2s at 120bpm)
    recorder.tick(4.1);
    expect(recorder.state).toBe("done");
    expect(recorder.loop).not.toBeNull();
    expect(recorder.loop!.frames.length).toBe(2);
    expect(recorder.loop!.bars).toBe(1);
  });

  it("does not record frames when idle", () => {
    const clock = createBarClock(120, 0);
    const recorder = createMotionRecorder(clock);
    recorder.record({ t: 0, pitch: 0, cutoff: 0, gate: false });
    expect(recorder.loop).toBeNull();
  });
});

describe("LoopScheduler", () => {
  it("adds and retrieves loops", () => {
    const clock = createBarClock(120, 0);
    const scheduler = createLoopScheduler(clock);

    const loop = {
      startTime: 0,
      durationS: 2,
      bars: 1,
      frames: [
        { t: 0, pitch: 0.3, cutoff: 800, gate: true },
        { t: 1, pitch: 0.7, cutoff: 1200, gate: true },
      ],
    };

    const id = scheduler.addLoop(loop);
    expect(scheduler.channels.length).toBe(1);

    const frame = scheduler.getFrame(id, 0.2);
    expect(frame).not.toBeNull();
    expect(frame!.pitch).toBe(0.3);
  });

  it("caps at 4 concurrent loops", () => {
    const clock = createBarClock(120, 0);
    const scheduler = createLoopScheduler(clock);
    const loop = { startTime: 0, durationS: 2, bars: 1, frames: [{ t: 0, pitch: 0, cutoff: 0, gate: false }] };

    for (let i = 0; i < 5; i++) {
      scheduler.addLoop(loop);
    }
    expect(scheduler.channels.length).toBe(4);
  });

  it("progress returns 0-1 normalized position", () => {
    const clock = createBarClock(120, 0);
    const scheduler = createLoopScheduler(clock);
    const loop = { startTime: 0, durationS: 2, bars: 1, frames: [{ t: 0, pitch: 0, cutoff: 0, gate: false }] };
    const id = scheduler.addLoop(loop);

    const p = scheduler.progress(id, 1.0);
    expect(p).toBeCloseTo(0.5, 6);
  });

  it("muted loop returns null frame", () => {
    const clock = createBarClock(120, 0);
    const scheduler = createLoopScheduler(clock);
    const loop = { startTime: 0, durationS: 2, bars: 1, frames: [{ t: 0, pitch: 0.5, cutoff: 500, gate: true }] };
    const id = scheduler.addLoop(loop);

    scheduler.muteLoop(id, true);
    expect(scheduler.getFrame(id, 0.5)).toBeNull();
  });
});
