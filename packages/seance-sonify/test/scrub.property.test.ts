import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { scrubIndex } from "../src/scrub.js";

describe("scrub property tests", () => {
  it("Property 7: scrub index bounds — index is always an integer in [0, N-1]", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.integer({ min: 1, max: 10000 }),
        (rollDeg, n) => {
          const { index, state } = scrubIndex(rollDeg, n);

          expect(Number.isInteger(index)).toBe(true);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThanOrEqual(n - 1);
          expect(Number.isFinite(state.filteredAngle)).toBe(true);
        },
      ),
    );
  });
});
