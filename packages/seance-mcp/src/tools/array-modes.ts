import { readFileSync } from "node:fs";
import { decodeTrace, analyzeModalFrequencies } from "seance-core";
import type { ModalAnalysisResult } from "seance-core";

export interface ArrayModesInput {
  tracePath: string;
  skewMs?: number;
}

export function arrayModes(input: ArrayModesInput): ModalAnalysisResult {
  const raw = readFileSync(input.tracePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf-8"));
  } catch {
    parsed = raw;
  }
  const trace = decodeTrace(parsed);

  const memberSignals = trace.channels.map((ch) => {
    const fs = ch.t.length > 1 ? 1000 / ((ch.t[ch.t.length - 1]! - ch.t[0]!) / (ch.t.length - 1)) : 50;
    return {
      id: ch.id,
      values: ch.data[0] ?? [],
      fs,
    };
  });

  return analyzeModalFrequencies(memberSignals, input.skewMs ?? 5.0);
}
