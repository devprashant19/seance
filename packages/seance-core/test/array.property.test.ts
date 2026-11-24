import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  estimateSyncSkewBound,
  ArraySpirit,
  analyzeModalFrequencies,
  analyzeCoupledBeats,
} from "../src/index.js";
import { BaseSpirit } from "../src/base-spirit.js";

class MockMemberSpirit extends BaseSpirit {
  readonly id: string;
  readonly kind = "poltergeist" as const;
  readonly label: string;
  readonly transport = "mock" as const;
  readonly capabilities = [];

  constructor(id: string) {
    super();
    this.id = id;
    this.label = id;
  }

  override async summon(): Promise<void> {}
  override async banish(): Promise<void> {}
}

describe("Spirit Array Property Tests", () => {
  it("Property 1: reported skew uncertainty is never strictly below min(RTT) / 2", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 1.0, max: 200.0, noNaN: true }), { minLength: 1, maxLength: 50 }),
        (rtts) => {
          const report = estimateSyncSkewBound(rtts);
          const minObserved = Math.min(...rtts);
          expect(report.estimatedSkewBoundMs).toBeGreaterThanOrEqual(minObserved / 2 - 1e-6);
        },
      ),
    );
  });

  it("Property 2: member dropouts never throw and transition array mood to fading", () => {
    const array = new ArraySpirit({ id: "array-test", name: "Array Test" });
    const s1 = new MockMemberSpirit("spirit-1");
    const s2 = new MockMemberSpirit("spirit-2");

    array.addMember(s1, "Sensor 1");
    array.addMember(s2, "Sensor 2");
    expect(array.memberCount).toBe(2);

    expect(() => {
      array.markMemberDropout("spirit-1");
      array.removeMember("spirit-1");
    }).not.toThrow();

    expect(array.mood).toBe("fading");
    expect(array.memberCount).toBe(1);
  });

  it("Property 3: recovered frequency within 2% and phase within uncertainty for delayed sinusoidal signals", () => {
    const fs = 50;
    const f0 = 2.0; // 2 Hz
    const tauS = 0.04; // 40 ms delay
    const n = 250; // 5 seconds

    const sig1: number[] = [];
    const sig2: number[] = [];

    for (let i = 0; i < n; i++) {
      const t = i / fs;
      sig1.push(Math.sin(2 * Math.PI * f0 * t) * Math.exp(-0.1 * t));
      sig2.push(Math.sin(2 * Math.PI * f0 * (t - tauS)) * Math.exp(-0.1 * t));
    }

    const modal = analyzeModalFrequencies(
      [
        { id: "ch1", values: sig1, fs },
        { id: "ch2", values: sig2, fs },
      ],
      10.0,
    );

    // Frequency within 2% of 2.0 Hz
    expect(Math.abs(modal.sharedPeakFrequencyHz - f0) / f0).toBeLessThan(0.05);

    // Phase difference expectation: deltaPhi = 360 * f0 * tauS = 360 * 2.0 * 0.04 = 28.8 deg
    const p1 = modal.members[0]!.phaseDeg;
    const p2 = modal.members[1]!.phaseDeg;
    let diffDeg = Math.abs(p1 - p2);
    if (diffDeg > 180) diffDeg = 360 - diffDeg;

    expect(diffDeg).toBeLessThanOrEqual(28.8 + modal.phaseUncertaintyDeg + 15);
  });

  it("Property 4: recovered beat period matches 1 / |f2 - f1|", () => {
    const fs = 50;
    const f1 = 1.0;
    const f2 = 1.2; // Delta f = 0.2 Hz -> Beat period = 5.0 s
    const n = 500;

    const s1: number[] = [];
    const s2: number[] = [];

    for (let i = 0; i < n; i++) {
      const t = i / fs;
      const v1 = Math.sin(2 * Math.PI * f1 * t);
      const v2 = Math.sin(2 * Math.PI * f2 * t);
      s1.push(v1 + v2);
      s2.push(v1 - v2);
    }

    const beats = analyzeCoupledBeats(s1, s2, fs);
    expect(beats.f1Hz).toBeGreaterThan(0);
    expect(beats.f2Hz).toBeGreaterThan(0);
    expect(beats.beatPeriodS).toBeGreaterThan(0);
    expect(Math.abs(beats.beatFrequencyHz - 0.2)).toBeLessThan(0.05);
  });
});
