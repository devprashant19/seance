import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { period, gFromPeriod, correctedG, finiteAmplitudeCorrection, effectiveLength } from "../src/experiments/pendulum-g/index.js";
import { heightFromFallTime, fallTimeFromHeight } from "../src/experiments/free-fall/index.js";
import { cantileverFrequency, youngsModulusFromFrequency } from "../src/experiments/singing-ruler/index.js";
import { pendulumUncertainty } from "../src/experiments/pendulum-g/uncertainty.js";

describe("pendulum-g property tests", () => {
  it("round-trip: g → T → g recovers original g", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 5.0, noNaN: true }),
        fc.double({ min: 5.0, max: 15.0, noNaN: true }),
        (L, g) => {
          const T = period(L, g);
          const recovered = gFromPeriod(L, T);
          expect(recovered).toBeCloseTo(g, 6);
        },
      ),
    );
  });

  it("δg monotonically increases with δL", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 3.0, noNaN: true }),
        fc.double({ min: 0.001, max: 0.01, noNaN: true }),
        fc.double({ min: 0.01, max: 0.1, noNaN: true }),
        (L, deltaL1, deltaL2larger) => {
          const dL1 = Math.min(deltaL1, deltaL2larger);
          const dL2 = Math.max(deltaL1, deltaL2larger);
          if (Math.abs(dL1 - dL2) < 1e-9) return;
          const u1 = pendulumUncertainty(L, dL1, 2.0, 0.01, 9.81);
          const u2 = pendulumUncertainty(L, dL2, 2.0, 0.01, 9.81);
          expect(u2.deltaG).toBeGreaterThanOrEqual(u1.deltaG - 1e-12);
        },
      ),
    );
  });

  it("finite amplitude correction is >= 1", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (theta) => {
          expect(finiteAmplitudeCorrection(theta)).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });

  it("effective length >= L", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 5.0, noNaN: true }),
        fc.double({ min: 0.05, max: 0.3, noNaN: true }),
        (L, hPhone) => {
          expect(effectiveLength(L, hPhone)).toBeGreaterThanOrEqual(L);
        },
      ),
    );
  });
});

describe("free-fall property tests", () => {
  it("round-trip: h → t → h recovers original h", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 50.0, noNaN: true }),
        fc.double({ min: 5.0, max: 15.0, noNaN: true }),
        (h, g) => {
          const t = fallTimeFromHeight(h, g);
          const recovered = heightFromFallTime(t, g);
          expect(recovered).toBeCloseTo(h, 6);
        },
      ),
    );
  });

  it("time is non-negative for positive height", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100.0, noNaN: true }),
        (h) => {
          expect(fallTimeFromHeight(h)).toBeGreaterThan(0);
        },
      ),
    );
  });

  it("height increases with time", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 5.0, noNaN: true }),
        fc.double({ min: 0.01, max: 5.0, noNaN: true }),
        (t1, t2) => {
          const tSmall = Math.min(t1, t2);
          const tLarge = Math.max(t1, t2);
          if (Math.abs(tSmall - tLarge) < 1e-9) return;
          expect(heightFromFallTime(tLarge)).toBeGreaterThan(heightFromFallTime(tSmall));
        },
      ),
    );
  });
});

describe("singing-ruler property tests", () => {
  it("round-trip: E → f₁ → E recovers original E", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e9, max: 400e9, noNaN: true }),
        fc.double({ min: 0.0005, max: 0.005, noNaN: true }),
        fc.double({ min: 0.1, max: 0.5, noNaN: true }),
        fc.double({ min: 2000, max: 10000, noNaN: true }),
        (E, h, L, rho) => {
          const f1 = cantileverFrequency(E, h, L, rho);
          const recovered = youngsModulusFromFrequency(f1, h, L, rho);
          expect(recovered).toBeCloseTo(E, -2);
        },
      ),
    );
  });

  it("f ∝ L⁻²: doubling L halves frequency squared", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50e9, max: 300e9, noNaN: true }),
        fc.double({ min: 0.001, max: 0.003, noNaN: true }),
        fc.double({ min: 0.1, max: 0.25, noNaN: true }),
        fc.double({ min: 2000, max: 10000, noNaN: true }),
        (E, h, L, rho) => {
          const f1 = cantileverFrequency(E, h, L, rho);
          const f2 = cantileverFrequency(E, h, 2 * L, rho);
          expect(f1 / f2).toBeCloseTo(4, 1);
        },
      ),
    );
  });

  it("E ∝ f²: doubling frequency quadruples E", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 2000, noNaN: true }),
        fc.double({ min: 0.001, max: 0.003, noNaN: true }),
        fc.double({ min: 0.1, max: 0.4, noNaN: true }),
        fc.double({ min: 2000, max: 10000, noNaN: true }),
        (f1, h, L, rho) => {
          const E1 = youngsModulusFromFrequency(f1, h, L, rho);
          const E2 = youngsModulusFromFrequency(2 * f1, h, L, rho);
          expect(E2 / E1).toBeCloseTo(4, 1);
        },
      ),
    );
  });
});
