import type { MotionLoop, MotionFrame } from "./recorder.js";
import type { BarClock } from "./clock.js";

export interface LoopChannel {
  readonly id: string;
  readonly loop: MotionLoop;
  muted: boolean;
}

export interface LoopScheduler {
  readonly channels: readonly LoopChannel[];
  addLoop(loop: MotionLoop): string;
  removeLoop(id: string): void;
  muteLoop(id: string, muted: boolean): void;
  getFrame(id: string, now: number): MotionFrame | null;
  progress(id: string, now: number): number;
}

const LOOKAHEAD_MS = 100;
const INTERVAL_MS = 25;

let nextId = 0;

export function createLoopScheduler(clock: BarClock): LoopScheduler {
  const channels: LoopChannel[] = [];

  function findChannel(id: string): LoopChannel | undefined {
    return channels.find((c) => c.id === id);
  }

  return {
    get channels() { return channels as readonly LoopChannel[]; },

    addLoop(loop: MotionLoop): string {
      if (channels.length >= 4) {
        channels.shift();
      }
      const id = `loop-${nextId++}`;
      channels.push({ id, loop, muted: false });
      return id;
    },

    removeLoop(id: string) {
      const idx = channels.findIndex((c) => c.id === id);
      if (idx >= 0) channels.splice(idx, 1);
    },

    muteLoop(id: string, muted: boolean) {
      const ch = findChannel(id);
      if (ch) ch.muted = muted;
    },

    getFrame(id: string, now: number): MotionFrame | null {
      const ch = findChannel(id);
      if (!ch || ch.muted || ch.loop.frames.length === 0) return null;

      const loopPos = ((now - ch.loop.startTime) % ch.loop.durationS + ch.loop.durationS) % ch.loop.durationS;
      const targetT = ch.loop.startTime + loopPos;

      let best = ch.loop.frames[0]!;
      let bestDist = Infinity;
      for (const frame of ch.loop.frames) {
        const framePos = frame.t - ch.loop.startTime;
        const dist = Math.abs(framePos - loopPos);
        if (dist < bestDist) {
          bestDist = dist;
          best = frame;
        }
      }
      return best;
    },

    progress(id: string, now: number): number {
      const ch = findChannel(id);
      if (!ch) return 0;
      const loopPos = ((now - ch.loop.startTime) % ch.loop.durationS + ch.loop.durationS) % ch.loop.durationS;
      return loopPos / ch.loop.durationS;
    },
  };
}

export { LOOKAHEAD_MS, INTERVAL_MS };
