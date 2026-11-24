/**
 * Passport statistical measurements for real sensor traces and devices.
 */

import { median, detectGaps } from "../dsp/robust.js";
import type { GhostTrace } from "../trace.js";

export interface ChannelStats {
  readonly channelId: string;
  readonly sampleCount: number;
  readonly durationMs: number;
  readonly fsHz: number;
  readonly medianDtMs: number;
  readonly jitterCvPercent: number;
  readonly dropoutCount: number;
  readonly stillWindowFound: boolean;
  readonly noiseFloorSigma?: readonly number[];
  readonly axisMeans?: readonly number[];
  readonly gyroBiasRadS?: readonly number[];
  readonly gravityMagnitude?: number;
}

export interface DevicePassport {
  readonly schemaVersion: "1.0";
  readonly deviceId: string;
  readonly model: string;
  readonly platform: string;
  readonly userAgent: string;
  readonly timestamp: string;
  readonly channels: Record<string, ChannelStats>;
  readonly notes?: string;
}

export function computeChannelPassportStats(
  t: readonly number[],
  data: readonly (readonly number[])[],
  channelId: string,
): ChannelStats {
  const n = t.length;
  if (n < 2) {
    return {
      channelId,
      sampleCount: n,
      durationMs: 0,
      fsHz: 0,
      medianDtMs: 0,
      jitterCvPercent: 0,
      dropoutCount: 0,
      stillWindowFound: false,
    };
  }

  const dtList = new Float64Array(n - 1);
  let sumDt = 0;
  for (let i = 0; i < n - 1; i++) {
    const dt = t[i + 1]! - t[i]!;
    dtList[i] = dt;
    sumDt += dt;
  }

  const medDt = median(dtList);
  const meanDt = sumDt / (n - 1);
  let varDt = 0;
  for (let i = 0; i < n - 1; i++) {
    const diff = dtList[i]! - meanDt;
    varDt += diff * diff;
  }
  const stdDt = Math.sqrt(varDt / (n - 1));
  const jitterCv = meanDt > 0 ? (100 * stdDt) / meanDt : 0;
  const fs = medDt > 0 ? 1000 / medDt : 0;
  const dropouts = detectGaps(t, 3.0).length;

  const numAxes = data.length;
  const axisMeans = new Array<number>(numAxes).fill(0);
  for (let ax = 0; ax < numAxes; ax++) {
    let sum = 0;
    const axData = data[ax]!;
    for (let i = 0; i < n; i++) {
      sum += axData[i] ?? 0;
    }
    axisMeans[ax] = sum / n;
  }

  let stillWindowFound = false;
  let noiseFloorSigma: number[] | undefined;
  let gyroBias: number[] | undefined;
  let gravityMag: number | undefined;

  // Detect still window: window of at least 3 seconds (~3*fs samples) where |a| - 9.81 std < 0.05 m/s²
  if (channelId === "accelG" && numAxes >= 3 && fs > 0) {
    const windowSize = Math.floor(3 * fs);
    if (n >= windowSize) {
      const ax = data[0]!;
      const ay = data[1]!;
      const az = data[2]!;

      for (let start = 0; start <= n - windowSize; start += Math.max(1, Math.floor(windowSize / 4))) {
        let sumNorm = 0;
        const norms = new Float64Array(windowSize);
        for (let i = 0; i < windowSize; i++) {
          const idx = start + i;
          const mag = Math.sqrt(ax[idx]! * ax[idx]! + ay[idx]! * ay[idx]! + az[idx]! * az[idx]!);
          norms[i] = mag;
          sumNorm += mag;
        }
        const meanNorm = sumNorm / windowSize;
        let varNorm = 0;
        for (let i = 0; i < windowSize; i++) {
          const d = norms[i]! - meanNorm;
          varNorm += d * d;
        }
        const stdNorm = Math.sqrt(varNorm / windowSize);

        if (stdNorm < 0.15 && Math.abs(meanNorm - 9.81) < 1.0) {
          stillWindowFound = true;
          gravityMag = meanNorm;
          noiseFloorSigma = [stdNorm, stdNorm, stdNorm];
          break;
        }
      }
    }
  }

  if (channelId === "gyro" && numAxes >= 3) {
    gyroBias = axisMeans.slice(0, 3);
  }

  return {
    channelId,
    sampleCount: n,
    durationMs: t[n - 1]! - t[0]!,
    fsHz: fs,
    medianDtMs: medDt,
    jitterCvPercent: jitterCv,
    dropoutCount: dropouts,
    stillWindowFound,
    noiseFloorSigma,
    axisMeans,
    gyroBiasRadS: gyroBias,
    gravityMagnitude: gravityMag,
  };
}

export function createDevicePassport(trace: GhostTrace): DevicePassport {
  const channelStats: Record<string, ChannelStats> = {};

  for (const ch of trace.channels) {
    channelStats[ch.id] = computeChannelPassportStats(ch.t, ch.data, ch.id);
  }

  return {
    schemaVersion: "1.0",
    deviceId: trace.device?.model ?? trace.spiritId ?? "device-unknown",
    model: trace.device?.model ?? "Unknown Model",
    platform: trace.device?.platform ?? "Web",
    userAgent: trace.device?.userAgent ?? "Browser",
    timestamp: trace.startedAt ?? new Date().toISOString(),
    channels: channelStats,
    notes: trace.notes,
  };
}
