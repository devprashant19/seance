import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { snapToScale, SCALES, SCALE_NAMES } from "../src/audio/scales.js";
import { tiltToPitch, rollToCutoff, shakeToTremolo } from "../src/audio/mapping.js";

describe("snapToScale", () => {
  it("output is always a valid note in the selected scale", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -0.5, max: 1.5, noNaN: true }),
        fc.constantFrom(...SCALE_NAMES),
        (pitch, scaleName) => {
          const { frequency, noteIndex } = snapToScale(pitch, scaleName);
          const scale = SCALES[scaleName];
          expect(noteIndex).toBeGreaterThanOrEqual(0);
          expect(noteIndex).toBeLessThan(scale.length);
          expect(frequency).toBe(scale[noteIndex]);
        },
      ),
    );
  });

  it("hysteresis prevents note change for small perturbations", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCALE_NAMES),
        fc.integer({ min: 1, max: 10 }),
        (scaleName, noteIndex) => {
          const scale = SCALES[scaleName];
          if (noteIndex >= scale.length) return;
          const basePitch = noteIndex / (scale.length - 1);
          const jitter = 0.01;
          const result = snapToScale(basePitch + jitter, scaleName, noteIndex);
          expect(result.noteIndex).toBe(noteIndex);
        },
      ),
    );
  });

  it("large pitch change overcomes hysteresis", () => {
    const result1 = snapToScale(0, "graveyard");
    const result2 = snapToScale(0.5, "graveyard", result1.noteIndex);
    expect(result2.noteIndex).not.toBe(result1.noteIndex);
  });
});

describe("tiltToPitch", () => {
  it("returns values in [0, 1] for all inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
        (beta) => {
          const pitch = tiltToPitch(beta);
          expect(pitch).toBeGreaterThanOrEqual(0);
          expect(pitch).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("maps -45deg to 0 and +45deg to 1", () => {
    expect(tiltToPitch(-Math.PI / 4)).toBeCloseTo(0, 6);
    expect(tiltToPitch(Math.PI / 4)).toBeCloseTo(1, 6);
  });
});

describe("rollToCutoff", () => {
  it("returns values in [200, 5000] for all inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
        (gamma) => {
          const cutoff = rollToCutoff(gamma);
          expect(cutoff).toBeGreaterThanOrEqual(200);
          expect(cutoff).toBeLessThanOrEqual(5000);
        },
      ),
    );
  });
});

describe("shakeToTremolo", () => {
  it("returns zero depth below threshold", () => {
    const result = shakeToTremolo(0.5);
    expect(result.depth).toBe(0);
    expect(result.rate).toBe(0);
  });

  it("returns bounded depth and rate for all inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (accel) => {
          const { depth, rate } = shakeToTremolo(accel);
          expect(depth).toBeGreaterThanOrEqual(0);
          expect(depth).toBeLessThanOrEqual(1);
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(10);
        },
      ),
    );
  });
});
