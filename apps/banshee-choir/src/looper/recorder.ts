import type { BarClock } from "./clock.js";

export interface MotionFrame {
  t: number;
  pitch: number;
  cutoff: number;
  gate: boolean;
}

export interface MotionLoop {
  readonly startTime: number;
  readonly durationS: number;
  readonly bars: number;
  readonly frames: readonly MotionFrame[];
}

export type RecorderState = "idle" | "armed" | "recording" | "done";

export interface MotionRecorder {
  readonly state: RecorderState;
  readonly loop: MotionLoop | null;
  arm(bars: number): void;
  tick(now: number): void;
  record(frame: MotionFrame): void;
}

export function createMotionRecorder(clock: BarClock): MotionRecorder {
  let state: RecorderState = "idle";
  let targetBars = 1;
  let recordStart = 0;
  let recordDuration = 0;
  const frames: MotionFrame[] = [];
  let finishedLoop: MotionLoop | null = null;

  return {
    get state() { return state; },
    get loop() { return finishedLoop; },

    arm(bars: number) {
      targetBars = Math.max(1, Math.min(4, bars));
      state = "armed";
      frames.length = 0;
      finishedLoop = null;
    },

    tick(now: number) {
      if (state === "armed") {
        const nextBar = clock.nextBarStart(now);
        if (nextBar - now < 0.01) {
          state = "recording";
          recordStart = nextBar;
          recordDuration = clock.barLengthS * targetBars;
        }
      }

      if (state === "recording") {
        const elapsed = frames.length > 0 ? now - recordStart : 0;
        if (elapsed >= recordDuration && frames.length > 0) {
          finishedLoop = {
            startTime: recordStart,
            durationS: recordDuration,
            bars: targetBars,
            frames: [...frames],
          };
          state = "done";
        }
      }
    },

    record(frame: MotionFrame) {
      if (state === "recording") {
        frames.push(frame);
      }
    },
  };
}
