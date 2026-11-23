import { readFileSync } from "node:fs";
import { decodeTrace, computeTimingStats } from "seance-core";

export interface TraceStatsInput {
  path: string;
}

export interface TraceStatsResult {
  id: string;
  channels: number;
  totalSamples: number;
  durationMs: number;
  timing: {
    meanHz: number;
    medianIntervalMs: number;
    p95IntervalMs: number;
    jitterCv: number;
    dropouts: number;
  };
}

export function traceStats(input: TraceStatsInput): TraceStatsResult {
  const raw = readFileSync(input.path, "utf-8");
  const data: unknown = JSON.parse(raw);
  const trace = decodeTrace(data);

  let totalSamples = 0;
  let maxDuration = 0;
  let bestTiming = computeTimingStats([]);

  for (const ch of trace.channels) {
    totalSamples += ch.t.length;
    if (ch.t.length > 1) {
      const dur = ch.t[ch.t.length - 1]! - ch.t[0]!;
      if (dur > maxDuration) maxDuration = dur;
      const stats = computeTimingStats(ch.t);
      if (stats.count > bestTiming.count) bestTiming = stats;
    }
  }

  return {
    id: trace.id,
    channels: trace.channels.length,
    totalSamples,
    durationMs: maxDuration,
    timing: {
      meanHz: bestTiming.meanHz,
      medianIntervalMs: bestTiming.medianIntervalMs,
      p95IntervalMs: bestTiming.p95IntervalMs,
      jitterCv: bestTiming.jitterCv,
      dropouts: bestTiming.dropouts,
    },
  };
}
