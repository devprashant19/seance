import * as fs from "node:fs";
import { decodeTrace } from "seance-core";
import { earconsForTrace, mapToTone } from "seance-sonify";

export interface AuditSonificationInput {
  readonly tracePath: string;
}

export interface AuditSonificationOutput {
  readonly pitchSeparationSemitones: number;
  readonly minFreqHz: number;
  readonly maxFreqHz: number;
  readonly clippingEvents: number;
  readonly earconCollisions: number;
  readonly totalEarcons: number;
  readonly durationMs: number;
}

export function auditSonification(input: AuditSonificationInput): AuditSonificationOutput {
  const raw = fs.readFileSync(input.tracePath, "utf-8");
  const data: unknown = JSON.parse(raw);
  const trace = decodeTrace(data);

  const ch =
    trace.channels.find((c) => c.id === "gyro") ??
    trace.channels.find((c) => c.id === "accelG" || c.id === "accel") ??
    trace.channels[0];

  if (!ch || ch.t.length === 0 || !ch.data[0] || ch.data[0].length === 0) {
    throw new Error(`Trace does not contain sufficient sensor data: ${input.tracePath}`);
  }

  const t = ch.t;
  const v = ch.data[0];
  const n = Math.min(t.length, v.length);
  const durationMs = n > 1 ? (t[n - 1]! - t[0]!) : 0;

  let minFreq = 1320;
  let maxFreq = 220;
  let clippingEvents = 0;
  const range = { min: -3.0, max: 3.0 };

  for (let i = 0; i < n; i++) {
    const val = v[i]!;
    if (val < -10 || val > 10) {
      clippingEvents++;
    }
    const tone = mapToTone(val, range);
    if (tone.freqHz < minFreq) minFreq = tone.freqHz;
    if (tone.freqHz > maxFreq) maxFreq = tone.freqHz;
  }

  const pitchSeparationSemitones =
    minFreq > 0 && maxFreq >= minFreq
      ? 12 * Math.log2(maxFreq / minFreq)
      : 0;

  const earcons = earconsForTrace(t, v);
  let earconCollisions = 0;

  for (let i = 1; i < earcons.length; i++) {
    const prev = earcons[i - 1]?.tMs ?? 0;
    const curr = earcons[i]?.tMs ?? 0;
    if (curr - prev < 20) {
      earconCollisions++;
    }
  }

  return {
    pitchSeparationSemitones,
    minFreqHz: minFreq,
    maxFreqHz: maxFreq,
    clippingEvents,
    earconCollisions,
    totalEarcons: earcons.length,
    durationMs,
  };
}
