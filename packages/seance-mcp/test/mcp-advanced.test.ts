import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { runExperiment } from "../src/tools/run-experiment.js";
import { compareTraces } from "../src/tools/compare-traces.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../..", "fixtures/traces/raw");
const PENDULUM_A = resolve(FIXTURES_DIR, "2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance");
const PENDULUM_B = resolve(FIXTURES_DIR, "2026-11-22T10-00-00Z_probe-pendulum_phoneB.seance");
const STILL = resolve(FIXTURES_DIR, "2026-11-22T10-00-00Z_probe-still_androidA.seance");

describe("run_experiment", () => {
  it("analyses a pendulum trace and returns g measurement", async () => {
    const result = await runExperiment({
      tracePath: PENDULUM_A,
      experimentId: "pendulum-g",
      inputs: { stringLength: 1.0 },
    });

    expect(result.experimentId).toBe("pendulum-g");
    expect(result.unit).toBe("m/s^2");
    expect(result.measured).toBeGreaterThan(0);
    expect(result.uncertainty).toBeGreaterThan(0);
    expect(result.reference).toBe(9.81);
    expect(typeof result.percentError).toBe("number");
    expect(["high", "medium", "low"]).toContain(result.confidence);
  });

  it("warns for unknown experiment type", async () => {
    const result = await runExperiment({
      tracePath: STILL,
      experimentId: "unknown-experiment",
    });

    expect(result.warnings).toContain("Unknown experiment: unknown-experiment");
    expect(result.unit).toBe("unknown");
  });

  it("throws for invalid trace path", async () => {
    await expect(runExperiment({ tracePath: "/nonexistent.seance" })).rejects.toThrow();
  });
});

describe("compare_traces", () => {
  it("diffs two pendulum traces from different phones", () => {
    const result = compareTraces({ traceA: PENDULUM_A, traceB: PENDULUM_B });

    expect(result.traceAId).toBeTruthy();
    expect(result.traceBId).toBeTruthy();
    expect(typeof result.timingDiff.rateDeltaHz).toBe("number");
    expect(typeof result.timingDiff.jitterDeltaPct).toBe("number");
    expect(typeof result.timingDiff.dropoutDelta).toBe("number");
    expect(result.channelComparison.length).toBeGreaterThan(0);
    expect(result.summary).toContain("Rate difference");
  });

  it("computes channel RMS difference with valid overlap", () => {
    const result = compareTraces({ traceA: PENDULUM_A, traceB: PENDULUM_B });

    for (const ch of result.channelComparison) {
      expect(ch.rmsDifference).toBeGreaterThanOrEqual(0);
      expect(ch.sampleOverlap).toBeGreaterThan(0);
      expect(ch.channel).toBeTruthy();
    }
  });

  it("throws for invalid trace path", () => {
    expect(() => compareTraces({ traceA: "/nonexistent.seance", traceB: PENDULUM_B })).toThrow();
  });
});
