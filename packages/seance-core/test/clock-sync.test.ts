import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ClockSync } from "../src/transports/phone-bridge/clock-sync.js";

describe("ClockSync", () => {
  it("starts not ready", () => {
    const cs = new ClockSync();
    expect(cs.isReady).toBe(false);
    expect(cs.estimate).toBeUndefined();
    expect(cs.sampleCount).toBe(0);
  });

  it("becomes ready after 3 samples", () => {
    const cs = new ClockSync();
    for (let i = 0; i < 3; i++) {
      cs.addSample({ t0: i * 100, t1: i * 100 + 50, t2: i * 100 + 55, t3: i * 100 + 100 });
    }
    expect(cs.isReady).toBe(true);
    expect(cs.sampleCount).toBe(3);
  });

  it("computes zero offset for symmetric RTT with no clock skew", () => {
    const cs = new ClockSync();
    for (let i = 0; i < 5; i++) {
      cs.addSample({ t0: 0, t1: 25, t2: 75, t3: 100 });
    }
    const est = cs.estimate!;
    expect(est.offsetMs).toBeCloseTo(0, 1);
    expect(est.rttMs).toBeCloseTo(50, 1);
  });

  it("detects positive clock offset", () => {
    const cs = new ClockSync();
    const offset = 200;
    for (let i = 0; i < 5; i++) {
      cs.addSample({
        t0: 0,
        t1: 25 + offset,
        t2: 75 + offset,
        t3: 100,
      });
    }
    expect(cs.estimate!.offsetMs).toBeCloseTo(offset, 0);
  });

  it("converts between local and remote time", () => {
    const cs = new ClockSync();
    const offset = 100;
    for (let i = 0; i < 3; i++) {
      cs.addSample({ t0: 0, t1: 25 + offset, t2: 75 + offset, t3: 100 });
    }
    const local = 500;
    const remote = cs.localToRemote(local);
    const back = cs.remoteToLocal(remote);
    expect(back).toBeCloseTo(local, 0);
  });

  it("caps at MAX_SAMPLES (8) and drops oldest", () => {
    const cs = new ClockSync();
    for (let i = 0; i < 12; i++) {
      cs.addSample({ t0: 0, t1: 25, t2: 75, t3: 100 });
    }
    expect(cs.sampleCount).toBe(8);
  });

  it("resets state", () => {
    const cs = new ClockSync();
    for (let i = 0; i < 5; i++) {
      cs.addSample({ t0: 0, t1: 25, t2: 75, t3: 100 });
    }
    cs.reset();
    expect(cs.isReady).toBe(false);
    expect(cs.estimate).toBeUndefined();
    expect(cs.sampleCount).toBe(0);
  });

  it("property: round-trip conversion is identity", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.1, max: 100 }),
        (offset, rtt) => {
          const cs = new ClockSync();
          const halfRtt = rtt / 2;
          for (let i = 0; i < 3; i++) {
            cs.addSample({
              t0: 0,
              t1: halfRtt + offset,
              t2: halfRtt + rtt + offset,
              t3: rtt + rtt,
            });
          }
          const local = 1000;
          const remote = cs.localToRemote(local);
          const back = cs.remoteToLocal(remote);
          expect(back).toBeCloseTo(local, 4);
        },
      ),
    );
  });

  it("property: filters high-RTT outliers", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 50, max: 200 }),
        (trueOffset) => {
          const cs = new ClockSync();
          for (let i = 0; i < 5; i++) {
            cs.addSample({ t0: 0, t1: 25 + trueOffset, t2: 75 + trueOffset, t3: 100 });
          }
          cs.addSample({ t0: 0, t1: 500 + trueOffset, t2: 600 + trueOffset, t3: 1000 });

          expect(Math.abs(cs.estimate!.offsetMs - trueOffset)).toBeLessThan(5);
        },
      ),
    );
  });
});
