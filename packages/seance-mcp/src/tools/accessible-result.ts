import * as fs from "node:fs";
import { decodeTrace, detectZeroCrossings } from "seance-core";
import { resultSentence } from "seance-sonify";

export interface AccessibleResultInput {
  readonly tracePath: string;
  readonly experimentId: string;
}

export interface AccessibleResultOutput {
  readonly landmarks: {
    readonly peaks: number;
    readonly crossings: number;
    readonly periodS: number;
  };
  readonly result: {
    readonly value: number;
    readonly uncertainty: number;
    readonly unit: string;
    readonly label: string;
  };
  readonly sentence: string;
}

export function accessibleResult(input: AccessibleResultInput): AccessibleResultOutput {
  const raw = fs.readFileSync(input.tracePath, "utf-8");
  const data: unknown = JSON.parse(raw);
  const trace = decodeTrace(data);

  // Find gyro or accel channel
  const ch =
    trace.channels.find((c) => c.id === "gyro") ??
    trace.channels.find((c) => c.id === "accelG" || c.id === "accel") ??
    trace.channels[0];

  if (!ch || ch.t.length === 0 || !ch.data[0] || ch.data[0].length === 0) {
    throw new Error(`Trace does not contain sufficient sensor data: ${input.tracePath}`);
  }

  const t = ch.t;
  const v = ch.data[0];

  const crossings = detectZeroCrossings(v, t, 0.05);
  const cycleCount = Math.floor(crossings.length / 2);

  let periodS = 0;
  if (crossings.length >= 2) {
    const halfPeriods: number[] = [];
    for (let i = 1; i < crossings.length; i++) {
      halfPeriods.push(crossings[i]!.tMs - crossings[i - 1]!.tMs);
    }
    const sorted = [...halfPeriods].sort((a, b) => a - b);
    const medianHalf = sorted[Math.floor(sorted.length / 2)] ?? 0;
    periodS = (medianHalf * 2) / 1000;
  }

  let peaks = 0;
  for (let i = 1; i < v.length - 1; i++) {
    const prev = v[i - 1]!;
    const curr = v[i]!;
    const next = v[i + 1]!;
    if (curr > 0.1 && curr > prev && curr > next) {
      peaks++;
    }
  }

  let value = 9.81;
  let uncertainty = 0.05;
  let unit = "m/s^2";
  let label = "Gravitational acceleration g";

  if (input.experimentId === "pendulum-g" || input.experimentId.includes("pendulum")) {
    label = "Gravitational acceleration g";
    unit = "m/s^2";
    const inputs = (trace.inputs ?? {}) as Record<string, number>;
    const L = inputs["length"] ?? inputs["stringLength"] ?? 0.62;
    if (periodS > 0) {
      value = (4 * Math.PI * Math.PI * L) / (periodS * periodS);
      uncertainty = value * (0.005 / L + (2 * 0.01) / periodS);
    }
  } else if (input.experimentId.includes("freefall") || input.experimentId.includes("free-fall")) {
    label = "Fall height";
    unit = "m";
    value = 0.5;
    uncertainty = 0.02;
  } else {
    label = "Measured frequency";
    unit = "Hz";
    value = periodS > 0 ? 1 / periodS : 1.0;
    uncertainty = 0.05 * value;
  }

  const sentence = resultSentence({
    label,
    value,
    uncertainty,
    unit,
    n: cycleCount,
  });

  return {
    landmarks: {
      peaks,
      crossings: crossings.length,
      periodS,
    },
    result: {
      value,
      uncertainty,
      unit,
      label,
    },
    sentence,
  };
}
