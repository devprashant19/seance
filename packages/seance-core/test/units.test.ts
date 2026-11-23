import { describe, expect, it } from "vitest";
import {
  q,
  add,
  sub,
  scale,
  negate,
  abs,
  rawValue,
  convert,
  isConvertible,
} from "../src/units.js";

describe("units", () => {
  describe("q()", () => {
    it("creates a branded quantity", () => {
      const dist = q(5.0, "m");
      expect(rawValue(dist)).toBe(5.0);
    });

    it("preserves zero", () => {
      expect(rawValue(q(0, "s"))).toBe(0);
    });

    it("preserves negative values", () => {
      expect(rawValue(q(-9.81, "m/s^2"))).toBe(-9.81);
    });
  });

  describe("arithmetic", () => {
    it("adds same-unit quantities", () => {
      const a = q(3.0, "m");
      const b = q(4.0, "m");
      expect(rawValue(add(a, b))).toBeCloseTo(7.0);
    });

    it("subtracts same-unit quantities", () => {
      const a = q(10.0, "ms");
      const b = q(3.0, "ms");
      expect(rawValue(sub(a, b))).toBeCloseTo(7.0);
    });

    it("scales a quantity by a factor", () => {
      const a = q(5.0, "m/s^2");
      expect(rawValue(scale(a, 2))).toBeCloseTo(10.0);
    });

    it("negates a quantity", () => {
      const a = q(9.81, "m/s^2");
      expect(rawValue(negate(a))).toBeCloseTo(-9.81);
    });

    it("computes absolute value", () => {
      const a = q(-3.14, "rad");
      expect(rawValue(abs(a))).toBeCloseTo(3.14);
    });
  });

  describe("convert()", () => {
    it("converts degrees to radians", () => {
      const deg = q(180, "deg");
      const rad = convert(deg, "deg", "rad");
      expect(rawValue(rad)).toBeCloseTo(Math.PI);
    });

    it("converts radians to degrees", () => {
      const rad = q(Math.PI / 2, "rad");
      const deg = convert(rad, "rad", "deg");
      expect(rawValue(deg)).toBeCloseTo(90);
    });

    it("converts ms to s", () => {
      const ms = q(1500, "ms");
      const s = convert(ms, "ms", "s");
      expect(rawValue(s)).toBeCloseTo(1.5);
    });

    it("converts s to ms", () => {
      const s = q(2.5, "s");
      const ms = convert(s, "s", "ms");
      expect(rawValue(ms)).toBeCloseTo(2500);
    });

    it("converts Pa to GPa", () => {
      const pa = q(1e9, "Pa");
      const gpa = convert(pa, "Pa", "GPa");
      expect(rawValue(gpa)).toBeCloseTo(1.0);
    });

    it("converts degC to K", () => {
      const c = q(0, "degC");
      const k = convert(c, "degC", "K");
      expect(rawValue(k)).toBeCloseTo(273.15);
    });

    it("converts K to degC", () => {
      const k = q(373.15, "K");
      const c = convert(k, "K", "degC");
      expect(rawValue(c)).toBeCloseTo(100);
    });

    it("throws for unsupported conversions", () => {
      const m = q(5, "m");
      expect(() => convert(m, "m", "s")).toThrow("No conversion");
    });
  });

  describe("isConvertible()", () => {
    it("returns true for deg->rad", () => {
      expect(isConvertible("deg", "rad")).toBe(true);
    });

    it("returns false for m->s", () => {
      expect(isConvertible("m", "s")).toBe(false);
    });
  });
});
