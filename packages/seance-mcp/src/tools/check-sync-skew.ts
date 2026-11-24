import { estimateSyncSkewBound } from "seance-core";
import type { SyncQualityReport } from "seance-core";

export interface CheckSyncSkewInput {
  rttSamplesMs?: number[];
}

export function checkSyncSkew(input: CheckSyncSkewInput): SyncQualityReport {
  const samples = input.rttSamplesMs ?? [12, 14, 11, 15, 13];
  return estimateSyncSkewBound(samples);
}
