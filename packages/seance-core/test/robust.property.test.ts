import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  median,
  mad,
  detectGaps,
  detectClipping,
  auditTraceArtifacts,
} from "../src/dsp/robust.js";
import type { GhostTrace } from "../src/trace.js";

describe("Robust DSP Property Tests", () => {
  it("computes accurate median across odd and even lengths", () => {
    expect(median([1, 5, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("computes non-negative MAD", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 50 }), (arr) => {
        const m = mad(arr);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(m)).toBe(true);
      }),
    );
  });

  it("Property 8: injected gaps are always detected, uniform sampling never flagged", () => {
    // 1. Uniform sampling: dt = 20ms
    const uniformT: number[] = [];
    for (let i = 0; i < 50; i++) {
      uniformT.push(i * 20);
    }
    const cleanGaps = detectGaps(uniformT, 3.0);
    expect(cleanGaps.length).toBe(0);

    // 2. Injected gap: inject 100ms interval (5x median)
    const gappedT = [...uniformT];
    gappedT[25] = gappedT[24]! + 120; // huge jump
    for (let i = 26; i < gappedT.length; i++) {
      gappedT[i] = gappedT[i - 1]! + 20;
    }
    const foundGaps = detectGaps(gappedT, 3.0);
    expect(foundGaps.length).toBeGreaterThanOrEqual(1);
    expect(foundGaps[0]!.dtMs).toBeGreaterThanOrEqual(120);
  });

  it("detects consecutive clipping artifacts at sensor boundaries", () => {
    const vals = [1.0, 2.0, 16.0, 16.0, 16.0, 16.0, 4.0, 3.0];
    const clipped = detectClipping(vals, 16.0, 3);
    expect(clipped.length).toBe(1);
    expect(clipped[0]!.count).toBe(4);
    expect(clipped[0]!.startIndex).toBe(2);
  });

  it("audits trace artifacts comprehensively", () => {
    const trace: GhostTrace = {
      format: "seance",
      version: 1,
      id: "trace-audit-test",
      channels: [
        {
          id: "accel",
          unit: "m/s^2",
          axes: ["x"],
          t: [0, 20, 40, 60, 80, 100],
          data: [[0, 1, 2, 3, 2, 1]],
        },
      ],
    };
    const report = auditTraceArtifacts(trace);
    expect(report.traceId).toBe("trace-audit-test");
    expect(report.channelAudits.length).toBe(1);
    expect(report.hasSevereArtifacts).toBe(false);
  });
});
