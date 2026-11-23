import { readFileSync } from "node:fs";
import { validateTrace, computeTimingStats, type GhostTrace } from "seance-core";

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

  if (!validateTrace(data)) {
    throw new Error(`Invalid .seance trace at ${input.path}`);
  }

  const trace = data as GhostTrace;
  let totalSamples = 0;
  let maxDuration = 0;
  let bestTiming = computeTimingStats([]);

  const channelList = Array.isArray(trace.channels)
    ? trace.channels
    : Object.values(trace.channels as Record<string, { t: readonly number[]; data: readonly (readonly number[])[] }>);

  for (const ch of channelList) {
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
    channels: channelList.length,
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
