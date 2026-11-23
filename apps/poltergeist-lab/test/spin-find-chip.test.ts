import { describe, it, expect } from "vitest";
import { totalAccel, solvePosition, steadyStatePosition, distanceFromEdges } from "../src/experiments/spin-find-chip/theory.js";
import { analyzeSpinFindChip } from "../src/experiments/spin-find-chip/analysis.js";

interface TimeSample {
  readonly t: number;
  readonly v: readonly number[];
}

function generateSpinTrace(
  rx: number,
  ry: number,
  omega0: number,
  tau: number,
  durationS: number,
  rateHz: number,
  accelNoiseSigma: number,
  gyroNoiseSigma: number,
): { gyro: TimeSample[]; accel: TimeSample[] } {
  const gyro: TimeSample[] = [];
  const accel: TimeSample[] = [];
  const dt = 1 / rateHz;

  const restSamples = 200;
  for (let i = 0; i < restSamples; i++) {
    const t = i * dt * 1000;
    gyro.push({ t, v: [0, 0, 0] });
    accel.push({ t, v: [0, 0, 9.81] });
  }

  const spinSamples = Math.floor(durationS * rateHz);
  const tOffset = restSamples * dt * 1000;
  for (let i = 0; i < spinSamples; i++) {
    const tLocal = i * dt;
    const t = tOffset + tLocal * 1000;
    const omega = omega0 * Math.exp(-tLocal / tau);
    const alpha = -omega0 / tau * Math.exp(-tLocal / tau);
    const [ax, ay] = totalAccel(omega, alpha, rx, ry);
    gyro.push({ t, v: [gyroNoiseSigma * randn(), gyroNoiseSigma * randn(), omega + gyroNoiseSigma * randn()] });
    accel.push({ t, v: [ax + accelNoiseSigma * randn(), ay + accelNoiseSigma * randn(), 9.81] });
  }
  return { gyro, accel };
}

let seed = 42;
function randn(): number {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  const u1 = seed / 0x7fffffff;
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  const u2 = seed / 0x7fffffff;
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

describe("spin-find-chip theory", () => {
  it("totalAccel round-trips with solvePosition", () => {
    const omega = 15;
    const alpha = -3;
    const rx = 0.015;
    const ry = 0.038;
    const [ax, ay] = totalAccel(omega, alpha, rx, ry);
    const [recoveredRx, recoveredRy] = solvePosition(omega, alpha, ax, ay);
    expect(recoveredRx).toBeCloseTo(rx, 10);
    expect(recoveredRy).toBeCloseTo(ry, 10);
  });

  it("steadyStatePosition matches solvePosition when alpha=0", () => {
    const omega = 12;
    const rx = 0.02;
    const ry = -0.03;
    const [ax, ay] = totalAccel(omega, 0, rx, ry);
    const [ssRx, ssRy] = steadyStatePosition(omega, ax, ay);
    const [fullRx, fullRy] = solvePosition(omega, 0, ax, ay);
    expect(ssRx).toBeCloseTo(fullRx, 10);
    expect(ssRy).toBeCloseTo(fullRy, 10);
  });

  it("distanceFromEdges computes correct positions", () => {
    const { fromTopMm, fromLeftMm } = distanceFromEdges(0, 0, 0.071, 0.147);
    expect(fromTopMm).toBeCloseTo(73.5, 1);
    expect(fromLeftMm).toBeCloseTo(35.5, 1);
  });
});

describe("spin-find-chip analysis", () => {
  it("recovers known position from synthetic spin within 10mm", () => {
    const trueRx = 0.015;
    const trueRy = 0.038;
    seed = 42;

    const traces: { gyro: TimeSample[]; accel: TimeSample[] }[] = [];
    for (let i = 0; i < 3; i++) {
      traces.push(generateSpinTrace(trueRx, trueRy, 15, 5, 3, 100, 0.02, 0.005));
    }

    const gyro = traces.flatMap((t) => t.gyro);
    const accel = traces.flatMap((t) => t.accel);

    const result = analyzeSpinFindChip(gyro, accel, 0.071, 0.147);

    expect(result.spinsUsed).toBeGreaterThanOrEqual(1);
    expect(Math.abs(result.rx - trueRx)).toBeLessThan(0.010);
    expect(Math.abs(result.ry - trueRy)).toBeLessThan(0.010);
  });

  it("rotation equivariance: rotating r rotates the estimate", () => {
    const trueRx = 0.015;
    const trueRy = 0.038;
    const angle = Math.PI / 4;
    const rotRx = trueRx * Math.cos(angle) - trueRy * Math.sin(angle);
    const rotRy = trueRx * Math.sin(angle) + trueRy * Math.cos(angle);

    seed = 123;
    const { gyro: g1, accel: a1 } = generateSpinTrace(trueRx, trueRy, 15, 5, 3, 100, 0.01, 0.003);
    seed = 123;
    const { gyro: g2, accel: a2 } = generateSpinTrace(rotRx, rotRy, 15, 5, 3, 100, 0.01, 0.003);

    const r1 = analyzeSpinFindChip(g1, a1, 0.071, 0.147);
    const r2 = analyzeSpinFindChip(g2, a2, 0.071, 0.147);

    if (r1.spinsUsed > 0 && r2.spinsUsed > 0) {
      const angle1 = Math.atan2(r1.ry, r1.rx);
      const angle2 = Math.atan2(r2.ry, r2.rx);
      const angleDiff = Math.abs(angle2 - angle1);
      expect(Math.abs(angleDiff - angle)).toBeLessThan(0.3);
    }
  });

  it("rejects low spin rates (omega < 6 rad/s)", () => {
    seed = 999;
    const { gyro, accel } = generateSpinTrace(0.015, 0.038, 4, 10, 3, 100, 0.02, 0.005);
    const result = analyzeSpinFindChip(gyro, accel, 0.071, 0.147);
    expect(result.spinsUsed).toBe(0);
  });
});
