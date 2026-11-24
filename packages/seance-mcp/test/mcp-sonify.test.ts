import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { accessibleResult } from "../src/tools/accessible-result.js";
import { auditSonification } from "../src/tools/audit-sonification.js";

const FIXTURE_DIR = path.resolve(__dirname, "../../../fixtures/traces/raw");
const PENDULUM_TRACE = path.join(
  FIXTURE_DIR,
  "2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance",
);

describe("seance-mcp accessible and sonification tools", () => {
  it("accessible_result: extracts landmarks and produces scientific sentence with uncertainty", () => {
    const res = accessibleResult({
      tracePath: PENDULUM_TRACE,
      experimentId: "pendulum-g",
    });

    expect(res.landmarks.crossings).toBeGreaterThan(0);
    expect(res.landmarks.periodS).toBeGreaterThan(0.5);
    expect(res.result.value).toBeGreaterThan(8.0);
    expect(res.result.value).toBeLessThan(12.0);
    expect(res.result.uncertainty).toBeGreaterThan(0);
    expect(res.result.unit).toBe("m/s^2");
    expect(res.sentence).toContain("Gravitational acceleration g");
    expect(res.sentence).toContain("plus or minus");
  });

  it("audit_sonification: verifies pitch span and checks earcon collisions", () => {
    const res = auditSonification({
      tracePath: PENDULUM_TRACE,
    });

    expect(res.pitchSeparationSemitones).toBeGreaterThan(0);
    expect(res.minFreqHz).toBeGreaterThanOrEqual(220);
    expect(res.maxFreqHz).toBeLessThanOrEqual(1320);
    expect(res.totalEarcons).toBeGreaterThan(0);
    expect(res.durationMs).toBeGreaterThan(1000);
  });
});
