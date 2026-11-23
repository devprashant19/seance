import { readFileSync } from "node:fs";
import { decodeTrace, computeTimingStats, type GhostTrace } from "seance-core";

export interface CompareTracesInput {
  traceA: string;
  traceB: string;
}

export interface CompareTracesResult {
  traceAId: string;
  traceBId: string;
  timingDiff: {
    rateDeltaHz: number;
    jitterDeltaPct: number;
    dropoutDelta: number;
  };
  channelComparison: Array<{
    channel: string;
    rmsDifference: number;
    sampleOverlap: number;
  }>;
  summary: string;
}

function loadTrace(path: string): GhostTrace {
  const raw = readFileSync(path, "utf-8");
  const data: unknown = JSON.parse(raw);
  return decodeTrace(data);
}

function getChannelMap(trace: GhostTrace): Map<string, { t: readonly number[]; data: readonly (readonly number[])[] }> {
  const map = new Map<string, { t: readonly number[]; data: readonly (readonly number[])[] }>();
  for (const ch of trace.channels) {
    map.set(ch.id, { t: ch.t, data: ch.data });
  }
  return map;
}

function bestTimingFromTrace(trace: GhostTrace): ReturnType<typeof computeTimingStats> {
  let best = computeTimingStats([]);
  for (const ch of trace.channels) {
    if (ch.t.length > best.count) best = computeTimingStats(ch.t);
  }
  return best;
}

export function compareTraces(input: CompareTracesInput): CompareTracesResult {
  const traceA = loadTrace(input.traceA);
  const traceB = loadTrace(input.traceB);

  const statsA = bestTimingFromTrace(traceA);
  const statsB = bestTimingFromTrace(traceB);

  const channelsA = getChannelMap(traceA);
  const channelsB = getChannelMap(traceB);

  const channelComparison: CompareTracesResult["channelComparison"] = [];
  const allChannels = new Set([...channelsA.keys(), ...channelsB.keys()]);

  for (const chId of allChannels) {
    const a = channelsA.get(chId);
    const b = channelsB.get(chId);
    if (!a || !b) continue;

    const overlap = Math.min(a.t.length, b.t.length);
    if (overlap === 0) continue;

    let sumSqDiff = 0;
    for (let i = 0; i < overlap; i++) {
      const valA = a.data[i]?.[0] ?? 0;
      const valB = b.data[i]?.[0] ?? 0;
      sumSqDiff += (valA - valB) ** 2;
    }
    const rms = Math.sqrt(sumSqDiff / overlap);

    channelComparison.push({ channel: chId, rmsDifference: rms, sampleOverlap: overlap });
  }

  const rateDelta = statsA.meanHz - statsB.meanHz;
  const jitterDelta = statsA.jitterCv - statsB.jitterCv;
  const dropoutDelta = statsA.dropouts - statsB.dropouts;

  const summary = [
    `Rate difference: ${rateDelta.toFixed(1)} Hz`,
    `Jitter difference: ${jitterDelta.toFixed(2)}%`,
    `Dropout difference: ${dropoutDelta}`,
    `Channels compared: ${channelComparison.length}`,
  ].join(". ");

  return {
    traceAId: traceA.id,
    traceBId: traceB.id,
    timingDiff: {
      rateDeltaHz: rateDelta,
      jitterDeltaPct: jitterDelta,
      dropoutDelta,
    },
    channelComparison,
    summary,
  };
}
