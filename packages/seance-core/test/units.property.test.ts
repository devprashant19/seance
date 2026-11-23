import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { q, add, sub, scale, convert, rawValue } from "../src/units.js";
import { arbQuantity } from "../src/testing/arbitraries.js";

describe("units (property-based)", () => {
  it("add is commutative", () => {
    fc.assert(
      fc.property(arbQuantity("m"), arbQuantity("m"), (a, b) => {
        expect(rawValue(add(a, b))).toBeCloseTo(rawValue(add(b, a)));
      }),
    );
  });

  it("sub(a, a) = 0", () => {
    fc.assert(
      fc.property(arbQuantity("m/s^2"), (a) => {
        expect(rawValue(sub(a, a))).toBeCloseTo(0);
      }),
    );
  });

  it("scale by 1 is identity", () => {
    fc.assert(
      fc.property(arbQuantity("rad/s"), (a) => {
        expect(rawValue(scale(a, 1))).toBeCloseTo(rawValue(a));
      }),
    );
  });

  it("scale by 0 gives 0", () => {
    fc.assert(
      fc.property(arbQuantity("Hz"), (a) => {
        expect(rawValue(scale(a, 0))).toBeCloseTo(0);
      }),
    );
  });

  it("deg->rad->deg round-trips", () => {
    fc.assert(
      fc.property(
        fc.double({
          noNaN: true,
          noDefaultInfinity: true,
          min: -360,
          max: 360,
        }),
        (d) => {
          const deg = q(d, "deg");
          const rad = convert(deg, "deg", "rad");
          const back = convert(rad, "rad", "deg");
          expect(rawValue(back)).toBeCloseTo(d, 8);
        },
      ),
    );
  });

  it("ms->s->ms round-trips", () => {
    fc.assert(
      fc.property(
        fc.double({
          noNaN: true,
          noDefaultInfinity: true,
          min: 0,
          max: 60000,
        }),
        (m) => {
          const ms = q(m, "ms");
          const s = convert(ms, "ms", "s");
          const back = convert(s, "s", "ms");
          expect(rawValue(back)).toBeCloseTo(m, 6);
        },
      ),
    );
  });

  it("conversion is linear (factor-only pairs)", () => {
    fc.assert(
      fc.property(
        fc.double({
          noNaN: true,
          noDefaultInfinity: true,
          min: -1e6,
          max: 1e6,
        }),
        fc.double({
          noNaN: true,
          noDefaultInfinity: true,
          min: -1e6,
          max: 1e6,
        }),
        (a, b) => {
          const sumFirst = convert(
            q(a + b, "deg"),
            "deg",
            "rad",
          );
          const convertFirst = rawValue(convert(q(a, "deg"), "deg", "rad")) +
            rawValue(convert(q(b, "deg"), "deg", "rad"));
          expect(rawValue(sumFirst)).toBeCloseTo(convertFirst, 6);
        },
      ),
    );
  });
});
