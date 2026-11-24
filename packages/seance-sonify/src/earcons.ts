import { detectZeroCrossings } from "seance-core";

export type EarconKind =
  | "zero-crossing"
  | "peak"
  | "trough"
  | "dropout"
  | "start"
  | "stop"
  | "result";

export interface EarconEvent {
  readonly kind: EarconKind;
  readonly tMs: number;
  readonly value?: number;
}

export interface EarconOptions {
  readonly hysteresis?: number;
  readonly peakThreshold?: number;
  readonly dropoutGapMs?: number;
}

export interface EarconAudioParams {
  readonly kind: EarconKind;
  readonly frequencies: readonly number[];
  readonly durationMs: number;
  readonly oscillatorType: OscillatorType | "noise";
  readonly gain: number;
  readonly envelope: "percussive" | "bell" | "triad";
}

export function getEarconAudioParams(kind: EarconKind): EarconAudioParams {
  switch (kind) {
    case "zero-crossing":
      return {
        kind,
        frequencies: [2000],
        durationMs: 12,
        oscillatorType: "noise",
        gain: 0.35,
        envelope: "percussive",
      };
    case "peak":
      return {
        kind,
        frequencies: [880, 1320],
        durationMs: 120,
        oscillatorType: "sine",
        gain: 0.4,
        envelope: "bell",
      };
    case "trough":
      return {
        kind,
        frequencies: [440, 660],
        durationMs: 120,
        oscillatorType: "sine",
        gain: 0.35,
        envelope: "bell",
      };
    case "dropout":
      return {
        kind,
        frequencies: [120],
        durationMs: 80,
        oscillatorType: "triangle",
        gain: 0.5,
        envelope: "percussive",
      };
    case "start":
      return {
        kind,
        frequencies: [330, 660],
        durationMs: 150,
        oscillatorType: "sine",
        gain: 0.4,
        envelope: "bell",
      };
    case "stop":
      return {
        kind,
        frequencies: [660, 330],
        durationMs: 150,
        oscillatorType: "sine",
        gain: 0.4,
        envelope: "bell",
      };
    case "result":
      return {
        kind,
        frequencies: [523.25, 659.25, 783.99],
        durationMs: 350,
        oscillatorType: "sine",
        gain: 0.45,
        envelope: "triad",
      };
  }
}

export function earconsForTrace(
  t: Float64Array | readonly number[],
  v: Float32Array | readonly number[],
  opts?: EarconOptions,
): EarconEvent[] {
  const events: EarconEvent[] = [];
  const n = Math.min(t.length, v.length);
  if (n === 0) return events;

  const hysteresis = opts?.hysteresis ?? 0.05;
  const dropoutGapMs = opts?.dropoutGapMs ?? 150;
  const peakThreshold = opts?.peakThreshold ?? 0.2;

  // 1. Detect zero-crossings using core DSP with hysteresis (values first, timestamps second)
  const tArr = t instanceof Float64Array ? t : new Float64Array(t);
  const vArr = v instanceof Float32Array ? v : new Float32Array(v);
  const crossings = detectZeroCrossings(vArr, tArr, hysteresis);

  for (const c of crossings) {
    events.push({
      kind: "zero-crossing",
      tMs: c.tMs,
    });
  }

  // 2. Detect dropouts and local peaks
  for (let i = 1; i < n; i++) {
    const prevT = t[i - 1] ?? 0;
    const currT = t[i] ?? 0;
    const dt = currT - prevT;

    if (dt > dropoutGapMs) {
      events.push({
        kind: "dropout",
        tMs: currT,
      });
    }

    // Local peak detection
    if (i >= 1 && i < n - 1) {
      const prevV = v[i - 1] ?? 0;
      const currV = v[i] ?? 0;
      const nextV = v[i + 1] ?? 0;

      if (currV > peakThreshold && currV > prevV && currV > nextV) {
        events.push({
          kind: "peak",
          tMs: currT,
          value: currV,
        });
      } else if (currV < -peakThreshold && currV < prevV && currV < nextV) {
        events.push({
          kind: "trough",
          tMs: currT,
          value: currV,
        });
      }
    }
  }

  // Sort events chronologically
  return events.sort((a, b) => a.tMs - b.tMs);
}
