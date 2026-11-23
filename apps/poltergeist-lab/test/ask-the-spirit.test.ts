import { describe, it, expect } from "vitest";
import { diagnoseDiscrepancies, type ExplanationFact } from "../src/oracle/explain.js";
import type { ExperimentResult, Verdict, TraceStats, BudgetTerm } from "../src/oracle/types.js";

function makeResult(overrides: Partial<ExperimentResult> = {}): ExperimentResult {
  return {
    measured: 9.81,
    uncertainty: 0.05,
    reference: 9.81,
    referenceUncertainty: 0.001,
    unit: "m/s²",
    quantity: "g",
    ...overrides,
  };
}

function makeStats(overrides: Partial<TraceStats> = {}): TraceStats {
  return {
    rateHz: 50,
    jitterPct: 5,
    dropouts: 0,
    dropoutPct: 0,
    durationS: 10,
    calibrated: true,
    noiseFloor: 0.01,
    ...overrides,
  };
}

function makeVerdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    tier: "approves",
    spooky: "Newton approves.",
    plain: "Measurement agrees with the reference within uncertainty.",
    percentError: 0,
    z: 0.1,
    confidence: "high",
    dominantTerm: { name: "measurement", share: 0.7 },
    causes: [],
    ...overrides,
  };
}

function makeBudget(overrides?: readonly BudgetTerm[]): readonly BudgetTerm[] {
  return overrides ?? [
    { name: "measurement", share: 0.7, value: 9.81, uncertainty: 0.05, unit: "m/s²" },
    { name: "reference", share: 0.3, value: 9.81, uncertainty: 0.001, unit: "m/s²" },
  ];
}

function makeFact(overrides: Partial<ExplanationFact> = {}): ExplanationFact {
  return {
    experimentId: "pendulum-g",
    result: makeResult(),
    stats: makeStats(),
    verdict: makeVerdict(),
    budget: makeBudget(),
    inputs: { lengthM: 1.0 },
    ...overrides,
  };
}

describe("diagnoseDiscrepancies", () => {
  it("fires jitter-high when jitterPct > 30", () => {
    const facts = makeFact({ stats: makeStats({ jitterPct: 45 }) });
    const diag = diagnoseDiscrepancies(facts);
    const jitter = diag.find((d) => d.id === "jitter-high");
    expect(jitter).toBeDefined();
    expect(jitter!.severity).toBe("high");
    expect(jitter!.plain).toContain("45.0%");
  });

  it("fires dropouts when dropouts > 0", () => {
    const facts = makeFact({ stats: makeStats({ dropouts: 3 }) });
    const diag = diagnoseDiscrepancies(facts);
    const drop = diag.find((d) => d.id === "dropouts");
    expect(drop).toBeDefined();
    expect(drop!.severity).toBe("medium");
    expect(drop!.plain).toContain("3 sample(s)");
  });

  it("fires length-dominates for pendulum with length share > timing share", () => {
    const budget: readonly BudgetTerm[] = [
      { name: "length", share: 0.6, value: 1.0, uncertainty: 0.01, unit: "m" },
      { name: "timing", share: 0.4, value: 1.56, uncertainty: 0.005, unit: "s" },
    ];
    const facts = makeFact({ budget });
    const diag = diagnoseDiscrepancies(facts);
    const ld = diag.find((d) => d.id === "length-dominates");
    expect(ld).toBeDefined();
    expect(ld!.severity).toBe("medium");
  });

  it("fires all-good when confidence high and error < 3%", () => {
    const facts = makeFact({
      verdict: makeVerdict({ confidence: "high", percentError: 1.5 }),
    });
    const diag = diagnoseDiscrepancies(facts);
    const good = diag.find((d) => d.id === "all-good");
    expect(good).toBeDefined();
    expect(good!.severity).toBe("info");
  });

  it("produces deterministic output for the same facts", () => {
    const facts = makeFact({
      stats: makeStats({ jitterPct: 40, dropouts: 2, calibrated: false }),
    });
    const diag1 = diagnoseDiscrepancies(facts);
    const diag2 = diagnoseDiscrepancies(facts);
    expect(diag1).toEqual(diag2);
  });

  it("returns at most 3 diagnoses sorted by severity (high > medium > low > info)", () => {
    const budget: readonly BudgetTerm[] = [
      { name: "length", share: 0.6, value: 1.0, uncertainty: 0.01, unit: "m" },
      { name: "timing", share: 0.4, value: 1.56, uncertainty: 0.005, unit: "s" },
    ];
    const facts = makeFact({
      stats: makeStats({ jitterPct: 50, dropouts: 5, calibrated: false }),
      verdict: makeVerdict({ confidence: "high", percentError: 2 }),
      budget,
    });
    const diag = diagnoseDiscrepancies(facts);
    expect(diag.length).toBeLessThanOrEqual(3);

    for (let i = 1; i < diag.length; i++) {
      const sevOrder = { high: 0, medium: 1, low: 2, info: 3 } as const;
      const prev = sevOrder[diag[i - 1]!.severity];
      const curr = sevOrder[diag[i]!.severity];
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it("fires ruler-clamp-compliance for singing-ruler with error < -15%", () => {
    const facts = makeFact({
      experimentId: "singing-ruler",
      result: makeResult({ measured: 150e9, reference: 200e9 }),
      verdict: makeVerdict({ percentError: -25 }),
    });
    const diag = diagnoseDiscrepancies(facts);
    const clamp = diag.find((d) => d.id === "ruler-clamp-compliance");
    expect(clamp).toBeDefined();
    expect(clamp!.severity).toBe("medium");
    expect(clamp!.plain).toContain("25.0%");
  });
});
