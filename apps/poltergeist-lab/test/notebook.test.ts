import { describe, it, expect } from "vitest";
import { formatMeasured, formatNumber } from "../src/features/notebook/formatter.js";

describe("formatNumber", () => {
  it("formats with specified significant figures", () => {
    expect(formatNumber(9.6213, 3)).toBe("9.62");
    expect(formatNumber(9.6213, 4)).toBe("9.621");
    expect(formatNumber(0.00482, 3)).toBe("0.00482");
  });

  it("handles zero", () => {
    expect(formatNumber(0, 3)).toBe("0");
  });

  it("handles large numbers with few sig figs", () => {
    const result = formatNumber(195e9, 3);
    expect(result).toContain("e");
  });
});

describe("formatMeasured", () => {
  it("formats value matched to uncertainty decimal places", () => {
    const result = formatMeasured(9.6213, 0.21, "m/s²");
    expect(result).toContain("9.62");
    expect(result).toContain("0.21");
    expect(result).toContain("m/s²");
    expect(result).toContain("±");
  });

  it("handles large uncertainty values", () => {
    const result = formatMeasured(195e9, 20e9, "Pa");
    expect(result).toContain("Pa");
    expect(result).toContain("±");
  });

  it("handles tiny values", () => {
    const result = formatMeasured(0.0048, 0.0003, "m");
    expect(result).toContain("0.0048");
    expect(result).toContain("0.0003");
    expect(result).toContain("m");
  });

  it("handles zero uncertainty gracefully", () => {
    const result = formatMeasured(9.81, 0, "m/s²");
    expect(result).toContain("9.81");
  });

  it("handles single-digit leading uncertainty", () => {
    const result = formatMeasured(9.81, 0.05, "m/s²");
    expect(result).toContain("9.81");
    expect(result).toContain("0.05");
  });

  it("handles uncertainty with leading digit >= 3 (1 sig fig)", () => {
    const result = formatMeasured(3.14159, 0.5, "rad");
    expect(result).toContain("3.1");
    expect(result).toContain("0.5");
    expect(result).toContain("rad");
  });
});
