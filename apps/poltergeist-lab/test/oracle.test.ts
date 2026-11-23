import { describe, it, expect } from "vitest";
import { judge } from "../src/oracle/judge.js";
import type {
  ExperimentResult,
  TraceStats,
  Diagnostic,
  BudgetTerm,
} from "../src/oracle/types.js";

function cleanStats(overrides: Partial<TraceStats> = {}): TraceStats {
  return {
    rateHz: 50,
    jitterPct: 3,
    dropouts: 0,
    dropoutPct: 0,
    durationS: 10,
    calibrated: true,
    noiseFloor: 0.01,
    ...overrides,
  };
}

function goodResult(overrides: Partial<ExperimentResult> = {}): ExperimentResult {
  return {
    measured: 9.81,
    uncertainty: 0.05,
    reference: 9.81,
    referenceUncertainty: 0.001,
    unit: "m/s^2",
    quantity: "g",
    ...overrides,
  };
}

function simpleBudget(): BudgetTerm[] {
  return [
    { name: "length", share: 0.7, value: 1.0, uncertainty: 0.005, unit: "m" },
    { name: "timing", share: 0.3, value: 2.0, uncertainty: 0.002, unit: "s" },
  ];
}

describe("Oracle judge", () => {
  it("returns 'approves' when measured matches reference within uncertainty", () => {
    const v = judge(goodResult(), cleanStats(), [], simpleBudget());
    expect(v.tier).toBe("approves");
    expect(v.confidence).toBe("high");
    expect(v.z).toBeCloseTo(0, 1);
    expect(v.percentError).toBeCloseTo(0, 1);
  });

  it("returns 'veil' when z is between 1 and 2", () => {
    const result = goodResult({ measured: 9.87, uncertainty: 0.04 });
    const v = judge(result, cleanStats(), [], simpleBudget());
    expect(v.z).toBeGreaterThan(1);
    expect(v.z).toBeLessThanOrEqual(2);
    expect(v.tier).toBe("veil");
  });

  it("returns 'disagree' when z is between 2 and 3", () => {
    const result = goodResult({ measured: 9.93, uncertainty: 0.04 });
    const v = judge(result, cleanStats(), [], simpleBudget());
    expect(v.z).toBeGreaterThan(2);
    expect(v.z).toBeLessThanOrEqual(3);
    expect(v.tier).toBe("disagree");
  });

  it("returns 'cursed' when z exceeds 3", () => {
    const result = goodResult({ measured: 10.5, uncertainty: 0.05 });
    const v = judge(result, cleanStats(), [], simpleBudget());
    expect(v.z).toBeGreaterThan(3);
    expect(v.tier).toBe("cursed");
  });

  it("forces 'cursed' when confidence is low even if z <= 1 (lucky guess from bad data)", () => {
    const result = goodResult();
    const stats = cleanStats({ jitterPct: 50 });
    const v = judge(result, stats, [], simpleBudget());
    expect(v.z).toBeCloseTo(0, 1);
    expect(v.confidence).toBe("low");
    expect(v.tier).toBe("cursed");
  });

  it("downgrades confidence to low on major diagnostic", () => {
    const diag: Diagnostic[] = [{ code: "SENSOR_FAULT", severity: "major" }];
    const v = judge(goodResult(), cleanStats(), diag, simpleBudget());
    expect(v.confidence).toBe("low");
    expect(v.tier).toBe("cursed");
  });

  it("downgrades confidence to low when dropoutPct > 2", () => {
    const stats = cleanStats({ dropouts: 15, dropoutPct: 3.1 });
    const v = judge(goodResult(), stats, [], simpleBudget());
    expect(v.confidence).toBe("low");
    expect(v.tier).toBe("cursed");
  });

  it("caps confidence at medium when uncalibrated", () => {
    const stats = cleanStats({ calibrated: false });
    const v = judge(goodResult(), stats, [], simpleBudget());
    expect(v.confidence).toBe("medium");
    expect(v.tier).toBe("approves");
  });

  it("caps confidence at medium on minor diagnostic", () => {
    const diag: Diagnostic[] = [{ code: "DRIFT", severity: "minor", value: 0.3, unit: "deg/s" }];
    const v = judge(goodResult(), cleanStats(), diag, simpleBudget());
    expect(v.confidence).toBe("medium");
  });

  it("identifies dominant budget term correctly", () => {
    const budget: BudgetTerm[] = [
      { name: "length", share: 0, value: 1.0, uncertainty: 0.1, unit: "m" },
      { name: "timing", share: 0, value: 2.0, uncertainty: 0.01, unit: "s" },
    ];
    const v = judge(goodResult(), cleanStats(), [], budget);
    expect(v.dominantTerm.name).toBe("length");
    const expectedShare = 0.1 ** 2 / (0.1 ** 2 + 0.01 ** 2);
    expect(v.dominantTerm.share).toBeCloseTo(expectedShare, 2);
  });

  it("computes signed percent error correctly", () => {
    const result = goodResult({ measured: 10.0, reference: 9.81 });
    const v = judge(result, cleanStats(), [], simpleBudget());
    expect(v.percentError).toBeCloseTo(100 * (10.0 - 9.81) / 9.81, 2);
  });

  it("includes causes sorted by severity (major first)", () => {
    const diag: Diagnostic[] = [
      { code: "MINOR_THING", severity: "minor" },
      { code: "MAJOR_THING", severity: "major" },
    ];
    const stats = cleanStats({ jitterPct: 35 });
    const v = judge(goodResult(), stats, diag, simpleBudget());
    const majIdx = v.causes.findIndex((c) => c.severity === "major");
    const minIdx = v.causes.findIndex((c) => c.severity === "minor");
    expect(majIdx).toBeGreaterThanOrEqual(0);
    expect(minIdx).toBeGreaterThan(-1);
    expect(majIdx).toBeLessThan(minIdx);
  });
});
