import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeClassStats, type TeamResult } from "../src/circle/stats.js";

describe("Circle Classroom Statistics Properties", () => {
  it("Property 1: Class summary statistics are invariant to team entry order (permutation)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            teamId: fc.string({ minLength: 1, maxLength: 8 }),
            teamName: fc.string({ minLength: 1, maxLength: 16 }),
            value: fc.double({ min: -100, max: 100, noNaN: true }),
            uncertainty: fc.double({ min: 0.01, max: 10, noNaN: true }),
            timestamp: fc.constant(1700000000000),
          }),
          { minLength: 3, maxLength: 15 },
        ),
        (results: TeamResult[]) => {
          const statsOriginal = computeClassStats(results);

          // Reverse order
          const reversed = [...results].reverse();
          const statsReversed = computeClassStats(reversed);

          expect(statsReversed.mean).toBeCloseTo(statsOriginal.mean, 6);
          expect(statsReversed.sampleStdDev).toBeCloseTo(statsOriginal.sampleStdDev, 6);
          expect(statsReversed.median).toBeCloseTo(statsOriginal.median, 6);
          expect(statsReversed.mad).toBeCloseTo(statsOriginal.mad, 6);
          expect(statsReversed.weightedMean).toBeCloseTo(statsOriginal.weightedMean, 6);
          expect(statsReversed.weightedUncertainty).toBeCloseTo(statsOriginal.weightedUncertainty, 6);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("Property 2: Weighted mean uncertainty is strictly less than or equal to the minimum individual uncertainty", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            teamId: fc.string({ minLength: 1, maxLength: 8 }),
            teamName: fc.string({ minLength: 1, maxLength: 16 }),
            value: fc.double({ min: 1, max: 50, noNaN: true }),
            uncertainty: fc.double({ min: 0.01, max: 5.0, noNaN: true }),
            timestamp: fc.constant(1700000000000),
          }),
          { minLength: 2, maxLength: 12 },
        ),
        (results: TeamResult[]) => {
          const stats = computeClassStats(results);
          const minIndividualUnc = Math.min(...results.map((r) => r.uncertainty));

          // 1/sqrt(sum(w_i)) <= min(sigma_i)
          expect(stats.weightedUncertainty).toBeLessThanOrEqual(minIndividualUnc + 1e-9);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("Property 3: Measurements exceeding 3*MAD from median are reliably flagged as outliers", () => {
    const normalTeams: TeamResult[] = [
      { teamId: "t1", teamName: "Team 1", value: 9.80, uncertainty: 0.05, timestamp: 1 },
      { teamId: "t2", teamName: "Team 2", value: 9.81, uncertainty: 0.04, timestamp: 2 },
      { teamId: "t3", teamName: "Team 3", value: 9.79, uncertainty: 0.05, timestamp: 3 },
      { teamId: "t4", teamName: "Team 4", value: 9.82, uncertainty: 0.06, timestamp: 4 },
      { teamId: "t5", teamName: "Team 5", value: 9.80, uncertainty: 0.04, timestamp: 5 },
      // Obvious outlier
      { teamId: "t-outlier", teamName: "Team Glitch", value: 12.50, uncertainty: 0.05, timestamp: 6 },
    ];

    const stats = computeClassStats(normalTeams);
    expect(stats.outlierTeamIds).toContain("t-outlier");
    expect(stats.outlierTeamIds).not.toContain("t1");
    expect(stats.count).toBe(6); // Retained, never censored
  });
});
