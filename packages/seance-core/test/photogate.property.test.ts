import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  timingUncertaintyS,
  computeGatePeriod,
  computeGateSpeed,
  computeGateRpm,
  detectCrossings,
  type CrossingEvent,
} from "../src/dsp/photogate.js";

describe("Photogate Properties", () => {
  it("Property 1: Timing uncertainty is strictly bounded below by 1 / (fps * sqrt(12))", () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 240, noNaN: true }), (fps) => {
        const uncWithCb = timingUncertaintyS(fps, true);
        const uncWithoutCb = timingUncertaintyS(fps, false);
        const theoreticalMin = 1 / (fps * Math.sqrt(12));

        expect(uncWithCb).toBeGreaterThanOrEqual(theoreticalMin - 1e-9);
        expect(uncWithoutCb).toBeGreaterThanOrEqual(theoreticalMin - 1e-9);
      }),
      { numRuns: 100 },
    );
  });

  it("Property 2: Synthetic crossing sequences recover known period within bounds across 24-60 fps", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 2.5, noNaN: true }), // Period in seconds
        fc.integer({ min: 3, max: 8 }),                  // Number of full cycles
        fc.integer({ min: 24, max: 60 }),                // Camera FPS
        (periodS, cycles, fps) => {
          const events: CrossingEvent[] = [];
          for (let i = 0; i <= cycles; i++) {
            // Timestamp in ms
            const tMs = i * periodS * 1000;
            events.push({ t: tMs, direction: "enter", delta: 50 });
          }

          const result = computeGatePeriod(events, fps);
          expect(result.cycleCount).toBe(cycles);
          expect(result.periodS).toBeCloseTo(periodS, 4);
          expect(result.uncertaintyS).toBeGreaterThan(0);
          // Recovered period is within bounds
          expect(Math.abs(result.periodS - periodS)).toBeLessThanOrEqual(result.uncertaintyS * 3 + 1e-4);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("Property 3: Nyquist aliasing is flagged whenever expected frequency > fps / 2", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 60 }),               // fps
        fc.double({ min: 0.1, max: 100, noNaN: true }), // true signal frequency
        (fps, trueFreq) => {
          // Synthetic signal sampled at fps
          const n = 64;
          const signal: number[] = [];
          for (let i = 0; i < n; i++) {
            const t = i / fps;
            signal.push(Math.sin(2 * Math.PI * trueFreq * t));
          }

          const result = computeGateRpm(signal, fps, 1, trueFreq);
          const nyquist = fps / 2;

          if (trueFreq > nyquist) {
            expect(result.isAliased).toBe(true);
            expect(result.warning).toBeDefined();
            expect(result.warning).toContain("aliasing");
          } else {
            expect(result.isAliased).toBe(false);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("Property 4: Speed and non-linear uncertainty propagation strictly obey Gaussian error laws", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.05, max: 2.0, noNaN: true }),  // distance in m
        fc.double({ min: 0.001, max: 0.05, noNaN: true }), // distance uncertainty in m
        fc.double({ min: 0.05, max: 2.0, noNaN: true }),  // deltaT in seconds
        fc.integer({ min: 24, max: 60 }),                 // fps
        (distM, distUncM, dtS, fps) => {
          const t1Ms = 1000;
          const t2Ms = t1Ms + dtS * 1000;

          const res = computeGateSpeed(t1Ms, t2Ms, distM, distUncM, fps);
          const expectedV = distM / dtS;
          expect(res.speedMPerS).toBeCloseTo(expectedV, 4);

          const relDist = distUncM / distM;
          const relTime = res.timingUncertaintyS / dtS;
          const expectedUnc = expectedV * Math.sqrt(relDist * relDist + relTime * relTime);

          expect(res.uncertaintyMPerS).toBeCloseTo(expectedUnc, 4);
        },
      ),
      { numRuns: 50 },
    );
  });
});
