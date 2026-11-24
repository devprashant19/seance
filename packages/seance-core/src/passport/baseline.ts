/**
 * Baseline comparison for device passports.
 */

import type { DevicePassport, ChannelStats } from "./stats.js";

export interface ChannelTolerance {
  readonly minFsHz?: number;
  readonly maxFsHz?: number;
  readonly maxJitterCvPercent?: number;
  readonly maxDropouts?: number;
  readonly maxNoiseFloorSigma?: number;
  readonly maxGyroBiasRadS?: number;
}

export interface DevicePassportBaseline {
  readonly deviceModel: string;
  readonly tolerances: Record<string, ChannelTolerance>;
  readonly baselineStats?: Record<string, Partial<ChannelStats>>;
}

export interface ComparisonVerdict {
  readonly verdict: "pass" | "drift" | "fail";
  readonly reasons: readonly string[];
  readonly channelDiffs: Record<string, {
    readonly fsDiffHz: number;
    readonly jitterCvDiffPercent: number;
    readonly dropoutDiff: number;
  }>;
}

export function comparePassportWithBaseline(
  passport: DevicePassport,
  baseline: DevicePassportBaseline,
): ComparisonVerdict {
  const reasons: string[] = [];
  const channelDiffs: ComparisonVerdict["channelDiffs"] = {};
  let isFail = false;
  let isDrift = false;

  for (const [chId, stats] of Object.entries(passport.channels)) {
    const tol = baseline.tolerances[chId] ?? {};
    const baseStat = baseline.baselineStats?.[chId];

    const fsDiff = baseStat?.fsHz !== undefined ? stats.fsHz - baseStat.fsHz : 0;
    const jitterDiff = baseStat?.jitterCvPercent !== undefined ? stats.jitterCvPercent - baseStat.jitterCvPercent : 0;
    const dropDiff = baseStat?.dropoutCount !== undefined ? stats.dropoutCount - baseStat.dropoutCount : 0;

    channelDiffs[chId] = {
      fsDiffHz: fsDiff,
      jitterCvDiffPercent: jitterDiff,
      dropoutDiff: dropDiff,
    };

    if (tol.minFsHz !== undefined && stats.fsHz < tol.minFsHz) {
      reasons.push(`${chId} sampling rate ${stats.fsHz.toFixed(1)} Hz is below minimum ${tol.minFsHz} Hz.`);
      isFail = true;
    }

    if (tol.maxJitterCvPercent !== undefined && stats.jitterCvPercent > tol.maxJitterCvPercent) {
      if (stats.jitterCvPercent > tol.maxJitterCvPercent * 1.5) {
        reasons.push(`${chId} jitter CV ${stats.jitterCvPercent.toFixed(1)}% exceeds maximum allowable ${tol.maxJitterCvPercent}%.`);
        isFail = true;
      } else {
        reasons.push(`${chId} jitter CV ${stats.jitterCvPercent.toFixed(1)}% shows noticeable timing drift.`);
        isDrift = true;
      }
    }

    if (tol.maxDropouts !== undefined && stats.dropoutCount > tol.maxDropouts) {
      reasons.push(`${chId} has ${stats.dropoutCount} dropouts (max allowed: ${tol.maxDropouts}).`);
      isFail = true;
    }

    if (stats.gravityMagnitude !== undefined) {
      const gErr = Math.abs(stats.gravityMagnitude - 9.81);
      if (gErr > 1.2) {
        reasons.push(`Gravity magnitude ${stats.gravityMagnitude.toFixed(2)} m/s² deviates significantly from 9.81 m/s².`);
        isFail = true;
      } else if (gErr > 0.5) {
        reasons.push(`Gravity magnitude ${stats.gravityMagnitude.toFixed(2)} m/s² has minor bias.`);
        isDrift = true;
      }
    }
  }

  const verdict: "pass" | "drift" | "fail" = isFail ? "fail" : isDrift ? "drift" : "pass";

  return {
    verdict,
    reasons: reasons.length > 0 ? reasons : ["All channel metrics within baseline tolerances."],
    channelDiffs,
  };
}
