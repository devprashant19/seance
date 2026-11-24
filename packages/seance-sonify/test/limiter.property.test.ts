import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeLimitedGain, DEFAULT_LIMITER_PARAMS } from "../src/limiter.js";

describe("limiter property tests", () => {
  it("Property 6: limiter output clamp — peak output never exceeds maxMasterGain (0.5) for any input", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000.0, noNaN: true }),
        (inputAmplitude) => {
          const limited = computeLimitedGain(inputAmplitude, DEFAULT_LIMITER_PARAMS);

          expect(Number.isFinite(limited)).toBe(true);
          expect(limited).toBeGreaterThanOrEqual(0);
          expect(limited).toBeLessThanOrEqual(DEFAULT_LIMITER_PARAMS.maxMasterGain + 1e-9);
        },
      ),
    );
  });
});
