/**
 * Robust statistics and artifact auditing for physical sensor streams.
 */

import type { GhostTrace, TraceChannel } from "../trace.js";

export function median(values: readonly number[] | Float64Array | Float32Array): number {
  const n = values.length;
  if (n === 0) return 0;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  if (n % 2 !== 0) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function mad(values: readonly number[] | Float64Array | Float32Array, precomputedMedian?: number): number {
  const n = values.length;
  if (n === 0) return 0;
  const med = precomputedMedian ?? median(values);
  const deviations = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    deviations[i] = Math.abs(values[i]! - med);
  }
  return median(deviations);
}

export interface GapArtifact {
  readonly index: number;
  readonly tMs: number;
  readonly dtMs: number;
  readonly expectedDtMs: number;
}

export function detectGaps(
  t: readonly number[] | Float64Array,
  factor = 3.0,
): GapArtifact[] {
  const n = t.length;
  if (n < 2) return [];

  const dtList = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    dtList[i] = t[i + 1]! - t[i]!;
  }
  const medDt = median(dtList);
  if (medDt <= 0) return [];

  const threshold = factor * medDt;
  const gaps: GapArtifact[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dt = dtList[i]!;
    if (dt > threshold) {
      gaps.push({
        index: i + 1,
        tMs: t[i + 1]!,
        dtMs: dt,
        expectedDtMs: medDt,
      });
    }
  }

  return gaps;
}

export interface ClippingArtifact {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly count: number;
  readonly value: number;
}

export function detectClipping(
  values: readonly number[] | Float32Array,
  reportedMax: number,
  minConsecutiveFrames = 3,
): ClippingArtifact[] {
  const n = values.length;
  const artifacts: ClippingArtifact[] = [];
  const eps = 1e-3;

  let currentStart = -1;
  let currentVal = 0;

  for (let i = 0; i < n; i++) {
    const v = values[i]!;
    const isClipped = Math.abs(Math.abs(v) - reportedMax) < eps;

    if (isClipped) {
      if (currentStart === -1) {
        currentStart = i;
        currentVal = v;
      }
    } else {
      if (currentStart !== -1) {
        const count = i - currentStart;
        if (count >= minConsecutiveFrames) {
          artifacts.push({
            startIndex: currentStart,
            endIndex: i - 1,
            count,
            value: currentVal,
          });
        }
        currentStart = -1;
      }
    }
  }

  if (currentStart !== -1) {
    const count = n - currentStart;
    if (count >= minConsecutiveFrames) {
      artifacts.push({
        startIndex: currentStart,
        endIndex: n - 1,
        count,
        value: currentVal,
      });
    }
  }

  return artifacts;
}

export interface ChannelAudit {
  readonly channelId: string;
  readonly sampleCount: number;
  readonly samplingHz: number;
  readonly medianDtMs: number;
  readonly jitterCvPercent: number;
  readonly gaps: readonly GapArtifact[];
  readonly clippingEvents: readonly ClippingArtifact[];
}

export interface TraceAuditReport {
  readonly traceId: string;
  readonly totalDurationMs: number;
  readonly channelAudits: readonly ChannelAudit[];
  readonly hasSevereArtifacts: boolean;
  readonly summary: string;
}

export function auditTraceArtifacts(trace: GhostTrace): TraceAuditReport {
  const channelAudits: ChannelAudit[] = [];
  let severe = false;

  for (const ch of trace.channels) {
    const n = ch.t.length;
    if (n < 2) continue;

    const dtList = new Float64Array(n - 1);
    let sumDt = 0;
    for (let i = 0; i < n - 1; i++) {
      const dt = ch.t[i + 1]! - ch.t[i]!;
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

    const gaps = detectGaps(ch.t, 3.0);

    // Approximate clipping detection: use 99.9th percentile or typical max (e.g. 16g ~ 156 m/s2, gyro ~ 34 rad/s)
    let maxAbs = 0;
    for (const axis of ch.data) {
      for (const v of axis) {
        if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
      }
    }
    const clippingEvents = maxAbs > 0 ? detectClipping(ch.data[0] ?? [], maxAbs, 3) : [];

    if (gaps.length > 5 || clippingEvents.length > 0 || jitterCv > 25) {
      severe = true;
    }

    channelAudits.push({
      channelId: ch.id,
      sampleCount: n,
      samplingHz: fs,
      medianDtMs: medDt,
      jitterCvPercent: jitterCv,
      gaps,
      clippingEvents,
    });
  }

  const duration = trace.durationMs ?? (trace.channels[0]?.t.at(-1) ?? 0) - (trace.channels[0]?.t[0] ?? 0);
  const totalGaps = channelAudits.reduce((acc, c) => acc + c.gaps.length, 0);

  return {
    traceId: trace.id,
    totalDurationMs: duration,
    channelAudits,
    hasSevereArtifacts: severe,
    summary: severe
      ? `Audit flagged artifacts: ${totalGaps} sampling gaps detected across channels.`
      : `Audit clean: ${channelAudits.length} channels analyzed without severe artifacts.`,
  };
}
