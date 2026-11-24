import { readFileSync, writeFileSync } from "node:fs";
import { decodeTrace, extractEventWindow, detectEnergyEvents, generateReplayRegressionTestCode } from "seance-core";
import type { GhostTrace } from "seance-core";

export interface ExtractEventWindowInput {
  tracePath: string;
  tMs?: number;
  outputPath?: string;
}

export interface ExtractEventWindowResult {
  eventTrace: GhostTrace;
  triggerTimeMs: number;
  outputPath?: string;
  testTemplate: string;
}

export function extractEventWindowTool(input: ExtractEventWindowInput): ExtractEventWindowResult {
  const raw = readFileSync(input.tracePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf-8"));
  } catch {
    parsed = raw;
  }
  const trace = decodeTrace(parsed);

  let targetTimeMs = input.tMs;
  if (targetTimeMs === undefined) {
    // Auto-detect highest energy event
    const accel = trace.channels.find((c) => c.id === "accel" || c.id === "accelG");
    if (accel && accel.data[0]) {
      const events = detectEnergyEvents(accel.t, accel.data[0]);
      if (events.length > 0) {
        targetTimeMs = events[0]!.tMs;
      }
    }
    if (targetTimeMs === undefined) {
      targetTimeMs = trace.durationMs ? trace.durationMs / 2 : 1000;
    }
  }

  const windowed = extractEventWindow(trace, targetTimeMs);

  if (input.outputPath) {
    writeFileSync(input.outputPath, JSON.stringify(windowed, null, 2), "utf-8");
  }

  const testCode = generateReplayRegressionTestCode(
    input.outputPath ?? input.tracePath,
    "event-window-peak",
    0.0,
    0.05,
  );

  return {
    eventTrace: windowed,
    triggerTimeMs: targetTimeMs,
    outputPath: input.outputPath,
    testTemplate: testCode,
  };
}
