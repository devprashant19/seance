import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Quaternion } from "three";
import {
  deviceOrientationToQuaternion,
  captureReference,
  headingNormaliser,
  computeGhostRotation,
  smoothStep,
} from "../src/orientation/math.js";

function quatLength(q: Quaternion): number {
  return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
}

function angleBetween(a: Quaternion, b: Quaternion): number {
  return 2 * Math.acos(Math.min(1, Math.abs(a.dot(b))));
}

describe("deviceOrientationToQuaternion", () => {
  it("produces unit quaternion at identity angles", () => {
    const q = deviceOrientationToQuaternion(0, 0, 0);
    expect(quatLength(q)).toBeCloseTo(1, 5);
  });

  it("property: always unit-norm and never NaN", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI, max: Math.PI }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI / 2, max: Math.PI / 2 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI / 2, max: Math.PI / 2 }),
        (alpha, beta, gamma) => {
          const q = deviceOrientationToQuaternion(alpha, beta, gamma);
          expect(Number.isNaN(q.x)).toBe(false);
          expect(Number.isNaN(q.y)).toBe(false);
          expect(Number.isNaN(q.z)).toBe(false);
          expect(Number.isNaN(q.w)).toBe(false);
          expect(quatLength(q)).toBeCloseTo(1, 4);
        },
      ),
    );
  });

  it("property: continuous across alpha wraparound (359.9 -> 0.1 deg)", () => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const q1 = deviceOrientationToQuaternion(toRad(359.9), 0, 0);
    const q2 = deviceOrientationToQuaternion(toRad(0.1), 0, 0);
    const angle = angleBetween(q1, q2);
    expect(angle).toBeLessThan(0.01);
  });
});

describe("captureReference", () => {
  it("returns identity for empty samples", () => {
    const q = captureReference([]);
    expect(q.w).toBeCloseTo(1, 5);
    expect(q.x).toBeCloseTo(0, 5);
  });

  it("returns unit quaternion for single sample", () => {
    const sample = new Quaternion(0.1, 0.2, 0.3, 0.9).normalize();
    const ref = captureReference([sample]);
    expect(quatLength(ref)).toBeCloseTo(1, 5);
  });

  it("averages consistent samples to approximately the same value", () => {
    const base = new Quaternion(0, 0, 0.1, 1).normalize();
    const samples = Array.from({ length: 10 }, () => base.clone());
    const ref = captureReference(samples);
    const angle = angleBetween(ref, base);
    expect(angle).toBeLessThan(0.01);
  });
});

describe("computeGhostRotation", () => {
  it("is identity when qNow equals qRef", () => {
    const qRef = deviceOrientationToQuaternion(0.5, 0.3, 0.1);
    const Y = headingNormaliser(qRef);
    const G = computeGhostRotation(qRef, qRef, Y);
    const angle = angleBetween(G, new Quaternion());
    expect(angle).toBeLessThan(0.001);
  });

  it("property: G is identity at qNow = qRef for any angles", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI, max: Math.PI }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI / 2, max: Math.PI / 2 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -Math.PI / 2, max: Math.PI / 2 }),
        (a, b, g) => {
          const q = deviceOrientationToQuaternion(a, b, g);
          const Y = headingNormaliser(q);
          const G = computeGhostRotation(q, q, Y);
          const angle = angleBetween(G, new Quaternion());
          expect(angle).toBeLessThan(0.01);
        },
      ),
    );
  });
});

describe("smoothStep", () => {
  it("does not increase angular distance to target", () => {
    const current = new Quaternion(0, 0, 0, 1);
    const target = new Quaternion(0, 0.3, 0, 0.95).normalize();
    const distBefore = angleBetween(current, target);
    const result = smoothStep(current, target, 1 / 60);
    const distAfter = angleBetween(result, target);
    expect(distAfter).toBeLessThanOrEqual(distBefore + 1e-6);
  });

  it("property: slerp never increases distance to target", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -1, max: 1 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -1, max: 1 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.001, max: 0.1 }),
        (ax, ty, dt) => {
          const current = new Quaternion(ax * 0.3, 0, 0, 1).normalize();
          const target = new Quaternion(0, ty * 0.3, 0, 1).normalize();
          const distBefore = angleBetween(current, target);
          const result = smoothStep(current, target, dt);
          const distAfter = angleBetween(result, target);
          expect(distAfter).toBeLessThanOrEqual(distBefore + 1e-5);
          expect(quatLength(result)).toBeCloseTo(1, 4);
        },
      ),
    );
  });

  it("converges to target over many steps", () => {
    let current = new Quaternion(0, 0, 0, 1);
    const target = new Quaternion(0, 0.7, 0, 0.7).normalize();
    for (let i = 0; i < 120; i++) {
      current = smoothStep(current, target, 1 / 60);
    }
    const finalAngle = angleBetween(current, target);
    expect(finalAngle).toBeLessThan(0.01);
  });
});
