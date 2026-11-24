import { readFileSync } from "node:fs";
import { decodeTrace, createDevicePassport } from "seance-core";
import type { DevicePassport } from "seance-core";

export interface SensorPassportInput {
  tracePath: string;
}

export function sensorPassport(input: SensorPassportInput): DevicePassport {
  const raw = readFileSync(input.tracePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf-8"));
  } catch {
    parsed = raw;
  }
  const trace = decodeTrace(parsed);
  return createDevicePassport(trace);
}
