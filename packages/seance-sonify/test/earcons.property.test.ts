import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { earconsForTrace, getEarconAudioParams } from "../src/earcons.js";

describe("earcons property tests", () => {
  it("Property 4: zero-crossing detection — sine wave crossings match period count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // cycles
        fc.integer({ min: 20, max: 50 }), // samples per cycle
        (cycles, samplesPerCycle) => {
          const totalSamples = cycles * samplesPerCycle;
          const t = new Float64Array(totalSamples);
          const v = new Float32Array(totalSamples);

          for (let i = 0; i < totalSamples; i++) {
            t[i] = i * 20; // 50 Hz sampling (20ms interval)
            const phase = (i / samplesPerCycle) * 2 * Math.PI;
            v[i] = Math.sin(phase);
          }

          const events = earconsForTrace(t, v, { hysteresis: 0.05 });
          const crossings = events.filter((e) => e.kind === "zero-crossing");

          // A sine wave of N cycles has approximately 2*N crossings
          const expectedCrossings = 2 * cycles;
          expect(Math.abs(crossings.length - expectedCrossings)).toBeLessThanOrEqual(2);
        },
      ),
    );
  });

  it("getEarconAudioParams: returns valid audio params for every earcon kind", () => {
    const kinds = [
      "zero-crossing",
      "peak",
      "trough",
      "dropout",
      "start",
      "stop",
      "result",
    ] as const;

    for (const kind of kinds) {
      const params = getEarconAudioParams(kind);
      expect(params.kind).toBe(kind);
      expect(params.durationMs).toBeGreaterThan(0);
      expect(params.gain).toBeGreaterThan(0);
      expect(params.gain).toBeLessThanOrEqual(0.5);
      expect(params.frequencies.length).toBeGreaterThan(0);
    }
  });
});
