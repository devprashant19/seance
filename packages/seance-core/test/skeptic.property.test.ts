import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  filterInfrasoundBand,
  computeRmsEnergy,
} from "../src/dsp/band.js";
import {
  analyzeRollingShutterFlicker,
} from "../src/dsp/spectrum-image.js";
import {
  validateClaimText,
  assertValidClaimText,
} from "../src/dsp/claim-guard.js";

describe("Skeptic's Environmental DSP & Claim Guard Properties", () => {
  it("Property 1: Bandpass filter preserves 10 Hz in-band signal while attenuating DC and 45 Hz by > 12 dB", () => {
    const fs = 100;
    const n = 200;

    // 10 Hz in-band signal
    const sig10Hz = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 10 * i) / fs));
    const filtered10Hz = filterInfrasoundBand(sig10Hz, fs);
    const rms10Hz = computeRmsEnergy(filtered10Hz.slice(50)); // Skip transient

    // DC signal (0 Hz constant 1.0)
    const sigDC = Array.from({ length: n }, () => 1.0);
    const filteredDC = filterInfrasoundBand(sigDC, fs);
    const rmsDC = computeRmsEnergy(filteredDC.slice(50));

    // 45 Hz out-of-band signal (near Nyquist)
    const sig45Hz = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 45 * i) / fs));
    const filtered45Hz = filterInfrasoundBand(sig45Hz, fs);
    const rms45Hz = computeRmsEnergy(filtered45Hz.slice(50));

    // DC attenuation > 12 dB (rmsDC < 0.25 * rms10Hz)
    expect(rmsDC).toBeLessThan(rms10Hz * 0.25);
    // 45 Hz attenuation > 12 dB
    expect(rms45Hz).toBeLessThan(rms10Hz * 0.25);
  });

  it("Property 2: Claim Guard strictly catches forbidden supernatural, medical, and structural safety claims", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "We have a ghost detected in the attic!",
          "The haunting confirmed by thermal imaging",
          "This app provides a medical diagnosis of acoustic sensitivity",
          "The laboratory is fully accessible to all learners",
          "Building foundation is structural safety certified",
          "Confirmed wave speed across table of 300 m/s",
        ),
        (badClaim) => {
          const res = validateClaimText(badClaim);
          expect(res.valid).toBe(false);
          expect(res.violations.length).toBeGreaterThan(0);
          expect(() => assertValidClaimText(badClaim)).toThrow();
        },
      ),
      { numRuns: 20 },
    );

    // Legitimate scientific text passes
    const validReport =
      "Measured structural vibration energy is 0.042 ± 0.005 m/s^2. Low-frequency ocular resonance at 19 Hz can cause visual distortions.";
    const validRes = validateClaimText(validReport);
    expect(validRes.valid).toBe(true);
    expect(validRes.violations.length).toBe(0);
  });

  it("Property 3: Rolling-shutter spatial FFT reliably detects periodic banding and maintains qualitative flag", () => {
    const height = 120;
    const testCycles = 6;
    // Generate synthetic camera row brightness with 6 dark/light bands
    const rowLuminances = Array.from({ length: height }, (_, r) => {
      return 120 + 35 * Math.sin((2 * Math.PI * testCycles * r) / height);
    });

    const report = analyzeRollingShutterFlicker(rowLuminances);
    expect(report.qualitative).toBe(true);
    expect(report.isFlickerDetected).toBe(true);
    expect(report.dominantSpatialCycles).toBeCloseTo(testCycles, 0);
    expect(report.explanation).toContain("Qualitative detection");
  });
});
