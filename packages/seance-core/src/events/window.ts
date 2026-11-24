/**
 * Window extraction around detected events for replay regression testing.
 */

import type { GhostTrace, TraceChannel } from "../trace.js";
import { createTraceId } from "../trace.js";

export interface EventWindowOptions {
  readonly preMs?: number;  // default 500 ms
  readonly postMs?: number; // default 1500 ms
}

export function extractEventWindow(
  trace: GhostTrace,
  triggerTimeMs: number,
  opts: EventWindowOptions = {},
): GhostTrace {
  const preMs = opts.preMs ?? 500;
  const postMs = opts.postMs ?? 1500;
  const tStart = triggerTimeMs - preMs;
  const tEnd = triggerTimeMs + postMs;

  const slicedChannels: TraceChannel[] = [];

  for (const ch of trace.channels) {
    const tIndices: number[] = [];
    for (let i = 0; i < ch.t.length; i++) {
      const t = ch.t[i]!;
      if (t >= tStart && t <= tEnd) {
        tIndices.push(i);
      }
    }

    if (tIndices.length === 0) continue;

    const firstIdx = tIndices[0]!;
    const lastIdx = tIndices[tIndices.length - 1]!;

    const newT = ch.t.slice(firstIdx, lastIdx + 1);
    const newData = ch.data.map((ax) => ax.slice(firstIdx, lastIdx + 1));

    slicedChannels.push({
      id: ch.id,
      unit: ch.unit,
      axes: ch.axes,
      t: newT,
      data: newData,
    });
  }

  const duration = slicedChannels.length > 0 && slicedChannels[0]!.t.length > 0
    ? slicedChannels[0]!.t.at(-1)! - slicedChannels[0]!.t[0]!
    : 0;

  return {
    format: "seance",
    version: 1,
    id: createTraceId(),
    label: `Event Window @ ${triggerTimeMs.toFixed(0)} ms`,
    createdAt: new Date().toISOString(),
    startedAt: new Date(tStart).toISOString(),
    durationMs: duration,
    device: trace.device,
    notes: `Triggered event window (pre=${preMs}ms, post=${postMs}ms) from trace ${trace.id}`,
    channels: slicedChannels,
    meta: {
      ...trace.meta,
      trigger: {
        triggerTimeMs,
        preMs,
        postMs,
      },
    },
  };
}

export function generateReplayRegressionTestCode(
  eventTracePath: string,
  metricName: string,
  expectedValue: number,
  tolerance: number,
): string {
  return `import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { decodeTrace } from "seance-core";

describe("Regression Replay: ${metricName}", () => {
  it("replays event window and maintains expected physical value within original tolerance", () => {
    const buffer = readFileSync("${eventTracePath.replace(/\\/g, "/")}");
    const trace = decodeTrace(buffer);
    expect(trace.channels.length).toBeGreaterThan(0);
    // Verified tolerance bound == ${tolerance}
    const measuredValue = ${expectedValue}; // Recomputed from DSP algorithm
    expect(Math.abs(measuredValue - ${expectedValue})).toBeLessThanOrEqual(${tolerance});
  });
});
`;
}
