import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { mapToTone } from "../src/mapping.js";

describe("mapToTone property tests", () => {
  it("Property 1: monotonic pitch — x1 < x2 implies freqHz(x1) <= freqHz(x2)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: 1, max: 500, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (base, span, u1, u2) => {
          const range = { min: base, max: base + span };
          const frac1 = Math.min(u1, u2);
          const frac2 = Math.max(u1, u2);
          const x1 = base + frac1 * span;
          const x2 = base + frac2 * span;

          const tone1 = mapToTone(x1, range);
          const tone2 = mapToTone(x2, range);

          expect(tone2.freqHz).toBeGreaterThanOrEqual(tone1.freqHz - 1e-9);
        },
      ),
    );
  });

  it("Property 2: frequency bounds — freqHz always strictly in [220, 1320] and never NaN/Infinity", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        (x, rMin, rMax) => {
          const range = { min: rMin, max: rMax };
          const tone = mapToTone(x, range);

          expect(Number.isFinite(tone.freqHz)).toBe(true);
          expect(tone.freqHz).toBeGreaterThanOrEqual(219.99);
          expect(tone.freqHz).toBeLessThanOrEqual(1320.01);
          expect(Number.isFinite(tone.pan)).toBe(true);
          expect(tone.pan).toBeGreaterThanOrEqual(-1.0);
          expect(tone.pan).toBeLessThanOrEqual(1.0);
        },
      ),
    );
  });

  it("Property 3: uncertainty tremolo monotonicity — tremoloDepth increases with sigma and stays <= 0.45", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (base, span, s1, s2) => {
          const range = { min: base, max: base + span };
          const sigma1 = Math.min(s1, s2);
          const sigma2 = Math.max(s1, s2);

          const tone1 = mapToTone(base + span / 2, range, sigma1);
          const tone2 = mapToTone(base + span / 2, range, sigma2);

          expect(tone2.tremoloDepth).toBeGreaterThanOrEqual(tone1.tremoloDepth - 1e-9);
          expect(tone1.tremoloDepth).toBeLessThanOrEqual(0.4501);
          expect(tone2.tremoloDepth).toBeLessThanOrEqual(0.4501);
          // Centre frequency unaffected by uncertainty
          expect(tone1.freqHz).toBeCloseTo(tone2.freqHz, 5);
        },
      ),
    );
  });
});
