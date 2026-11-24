import { readFileSync } from "node:fs";
import { comparePassportWithBaseline } from "seance-core";
import type { DevicePassport, DevicePassportBaseline, ComparisonVerdict } from "seance-core";

export interface CompareDeviceProfilesInput {
  samplePassportPath: string;
  baselinePath: string;
}

export function compareDeviceProfiles(input: CompareDeviceProfilesInput): ComparisonVerdict {
  const sampleRaw = JSON.parse(readFileSync(input.samplePassportPath, "utf-8")) as DevicePassport;
  const baselineRaw = JSON.parse(readFileSync(input.baselinePath, "utf-8")) as DevicePassportBaseline;

  return comparePassportWithBaseline(sampleRaw, baselineRaw);
}
