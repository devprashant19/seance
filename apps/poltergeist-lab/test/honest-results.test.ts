import { describe, it, expect } from "vitest";
import { judge } from "../src/oracle/judge.js";
import type { ExperimentResult, TraceStats } from "../src/oracle/types.js";
import { spinFindChip } from "../src/experiments/spin-find-chip/index.js";
import { boardModes } from "../src/experiments/board-modes/index.js";
import { coupledPendulums } from "../src/experiments/coupled-pendulums/index.js";
import { gateSpeed } from "../src/experiments/gate-speed/index.js";
import { gatePeriod } from "../src/experiments/gate-period/index.js";

const stats: TraceStats = {
  rateHz: 50, jitterPct: 3, dropouts: 0, dropoutPct: 0, durationS: 10, calibrated: true, noiseFloor: 0,
};

function result(over: Partial<ExperimentResult>): ExperimentResult {
  return { measured: 1, uncertainty: 0.1, reference: null, referenceUncertainty: 0, unit: "m", quantity: "x", ...over };
}

type Trace = { t: number; v: number[] }[];
const still = (seconds: number, rate = 50, v: number[] = [0, 0, 9.81]): Trace =>
  Array.from({ length: seconds * rate }, (_, i) => ({ t: (i * 1000) / rate, v: [...v] }));

describe("Oracle never fakes a pass", () => {
  it("reports a measurement (no pass/fail, no % error) when there is no reference", () => {
    const v = judge(result({ reference: null }), stats, [], []);
    expect(v.tier).toBe("measured");
    expect(Number.isNaN(v.percentError)).toBe(true);
    expect(Number.isNaN(v.z)).toBe(true);
    expect(v.spooky).not.toMatch(/approves/i);
  });

  it("does not call 0 vs a reference of 0 a 0 % error", () => {
    const v = judge(result({ measured: 0, uncertainty: 0, reference: 0, referenceUncertainty: 0 }), stats, [], []);
    expect(Number.isNaN(v.percentError)).toBe(true);
  });

  it("still judges real references", () => {
    expect(judge(result({ measured: 9.8, uncertainty: 0.05, reference: 9.81, referenceUncertainty: 0.001 }), stats, [], []).tier).toBe("approves");
    expect(judge(result({ measured: 9.0, uncertainty: 0.05, reference: 9.81, referenceUncertainty: 0.001 }), stats, [], []).tier).toBe("cursed");
  });
});

describe("experiments refuse to invent results", () => {
  it("spin: a phone that never spun is an error, not a distance of 0", () => {
    expect(() => spinFindChip.analyze({ gyro: still(10, 50, [0, 0, 0]), accelG: still(10) }, {})).toThrow(/No spin detected/);
  });

  it("plank: no ringing is an error (and no made-up second phone)", () => {
    expect(() => boardModes.analyze({ accelG: still(10) }, {})).toThrow(/No clear ringing/);
  });

  it("plank: finds a real resonance and has no reference to fake", () => {
    const rate = 100;
    const trace = Array.from({ length: 10 * rate }, (_, i) => {
      const t = i / rate;
      return { t: t * 1000, v: [0, 0, 9.81 + 2 * Math.exp(-t / 3) * Math.sin(2 * Math.PI * 17 * t)] };
    });
    const r = boardModes.analyze({ accelG: trace }, {});
    expect(r.measured).toBeCloseTo(17, 0);
    expect(r.reference).toBeNull();
  });

  it("coupled pendulums: one swing frequency only is an error, not a beat", () => {
    const rate = 50;
    const gyro = Array.from({ length: 40 * rate }, (_, i) => {
      const t = i / rate;
      return { t: t * 1000, v: [0, 0, Math.sin(2 * Math.PI * 0.5 * t)] };
    });
    expect(() => coupledPendulums.analyze({ gyro }, { stringLength: 1 })).toThrow(/Only one swing frequency/);
  });

  it("coupled pendulums: measures the beat from two real normal modes", () => {
    const rate = 50;
    const f1 = Math.sqrt(9.81 / 1) / (2 * Math.PI); // in-phase mode of 1 m pendulums
    const f2 = f1 + 0.1; // 10 s beat
    const gyro = Array.from({ length: 40 * rate }, (_, i) => {
      const t = i / rate;
      return { t: t * 1000, v: [0, 0, Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t)] };
    });
    const r = coupledPendulums.analyze({ gyro }, { stringLength: 1 });
    expect(r.measured).toBeGreaterThan(8.5);
    expect(r.measured).toBeLessThan(11.5);
    expect(r.reference).toBeNull();
  });

  it("gate speed: no crossings is an error, not an invented 100 ms gap", () => {
    const frames = Array.from({ length: 90 }, (_, i) => ({ t: i * 33, v: [1, 1] }));
    expect(() => gateSpeed.analyze({ "camera.gate": frames }, { distance: 0.2 })).toThrow(/wasn't seen crossing/);
  });

  it("gate period: no swings is an error, not a 2.0 s default", () => {
    const frames = Array.from({ length: 90 }, (_, i) => ({ t: i * 33, v: [0] }));
    expect(() => gatePeriod.analyze({ "camera.gate": frames }, { length: 1 })).toThrow(/No full swing/);
  });
});
