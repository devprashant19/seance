import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  expandUnitSpoken,
  formatWithUncertainty,
  resultSentence,
} from "../src/speech.js";

describe("speech synthesis and formatting tests", () => {
  it("expands standard units to natural spoken words", () => {
    expect(expandUnitSpoken("m/s^2")).toBe("metres per second squared");
    expect(expandUnitSpoken("Pa")).toBe("pascals");
    expect(expandUnitSpoken("Hz")).toBe("hertz");
    expect(expandUnitSpoken("m")).toBe("metres");
    expect(expandUnitSpoken("unknown-unit")).toBe("unknown-unit");
  });

  it("formats value and uncertainty with matching decimal precision", () => {
    const { valueStr, uncStr } = formatWithUncertainty(9.80665, 0.042);
    expect(uncStr).toBe("0.04");
    expect(valueStr).toBe("9.81");
  });

  it("Property 5: resultSentence determinism — same input always yields identical sentence with unit and uncertainty", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: 0.001, max: 50, noNaN: true }),
        (label, value, uncertainty) => {
          const params = {
            label,
            value,
            uncertainty,
            unit: "m/s^2",
          };

          const s1 = resultSentence(params);
          const s2 = resultSentence(params);

          expect(s1).toBe(s2);
          expect(s1).toContain("plus or minus");
          expect(s1).toContain("metres per second squared");
        },
      ),
    );
  });
});
