import type { Mood, HealthReport } from "./spirit.js";

export interface HealthThresholds {
  readonly maxJitterPct: number;
  readonly minRateHz: number;
  readonly maxDropoutsPerMin: number;
  readonly minMoodHoldMs: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  maxJitterPct: 15,
  minRateHz: 30,
  maxDropoutsPerMin: 5,
  minMoodHoldMs: 3000,
};

const MOOD_RANK: Record<Mood, number> = {
  calm: 0,
  uneasy: 1,
  restless: 2,
  fading: 3,
};

const RANK_TO_MOOD: readonly Mood[] = ["calm", "uneasy", "restless", "fading"];

function moodFromScore(score: number): Mood {
  if (score <= 0) return "calm";
  if (score >= 3) return "fading";
  return RANK_TO_MOOD[score]!;
}

export interface HealthSnapshot {
  readonly rateHz: number;
  readonly jitterPct: number;
  readonly dropoutsInWindow: number;
}

export class MoodMachine {
  private _mood: Mood = "calm";
  private _moodSetAt = 0;
  private readonly _thresholds: HealthThresholds;

  constructor(thresholds?: Partial<HealthThresholds>) {
    this._thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  get mood(): Mood {
    return this._mood;
  }

  evaluate(snapshot: HealthSnapshot, nowMs: number): Mood {
    let score = 0;

    if (snapshot.rateHz < this._thresholds.minRateHz) score += 2;
    if (snapshot.jitterPct > this._thresholds.maxJitterPct) score += 1;
    if (snapshot.dropoutsInWindow > this._thresholds.maxDropoutsPerMin) score += 1;

    const proposed = moodFromScore(score);
    const proposedRank = MOOD_RANK[proposed];
    const currentRank = MOOD_RANK[this._mood];

    if (proposedRank > currentRank) {
      this._mood = proposed;
      this._moodSetAt = nowMs;
    } else if (proposedRank < currentRank) {
      const elapsed = nowMs - this._moodSetAt;
      if (elapsed >= this._thresholds.minMoodHoldMs) {
        this._mood = proposed;
        this._moodSetAt = nowMs;
      }
    }

    return this._mood;
  }

  reset(): void {
    this._mood = "calm";
    this._moodSetAt = 0;
  }
}

export class HealthMonitor {
  private readonly _moodMachine: MoodMachine;
  private _dropoutTimestamps: number[] = [];
  private _windowMs = 60_000;

  constructor(thresholds?: Partial<HealthThresholds>) {
    this._moodMachine = new MoodMachine(thresholds);
  }

  get mood(): Mood {
    return this._moodMachine.mood;
  }

  recordDropout(nowMs: number): void {
    this._dropoutTimestamps.push(nowMs);
    this._pruneWindow(nowMs);
  }

  update(rateHz: number, jitterPct: number, nowMs: number): HealthReport {
    this._pruneWindow(nowMs);

    const mood = this._moodMachine.evaluate(
      {
        rateHz,
        jitterPct,
        dropoutsInWindow: this._dropoutTimestamps.length,
      },
      nowMs,
    );

    return {
      rateHz,
      jitterPct,
      dropouts: this._dropoutTimestamps.length,
      calibrated: rateHz > 0,
      mood,
      reason: this._reasonFor(mood, rateHz, jitterPct),
    };
  }

  reset(): void {
    this._moodMachine.reset();
    this._dropoutTimestamps = [];
  }

  private _pruneWindow(nowMs: number): void {
    const cutoff = nowMs - this._windowMs;
    this._dropoutTimestamps = this._dropoutTimestamps.filter((t) => t > cutoff);
  }

  private _reasonFor(mood: Mood, rateHz: number, jitterPct: number): string {
    switch (mood) {
      case "calm":
        return "Signal nominal";
      case "uneasy":
        return jitterPct > 15
          ? `Jitter elevated (${jitterPct.toFixed(1)}%)`
          : `Signal degraded (${rateHz.toFixed(0)} Hz)`;
      case "restless":
        return `Multiple issues: rate=${rateHz.toFixed(0)} Hz, jitter=${jitterPct.toFixed(1)}%`;
      case "fading":
        return `Signal critically degraded (${rateHz.toFixed(0)} Hz, ${this._dropoutTimestamps.length} dropouts)`;
    }
  }
}
