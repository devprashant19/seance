import { describe, expect, it } from "vitest";
import { computeTimingStats } from "../src/dsp/timing.js";
import { linearResample } from "../src/dsp/resample.js";
import { designBiquad, applyBiquad } from "../src/dsp/filters.js";
import { realFftWithRate } from "../src/dsp/fft.js";
import { detectZeroCrossings, detectFreeFall } from "../src/dsp/events.js";
import { estimateDamping } from "../src/dsp/damping.js";
import { linearFit } from "../src/dsp/fit.js";
import { meanWithUncertainty, propagateAdd } from "../src/dsp/uncertainty.js";

describe("timing", () => {
  it("computes stats for uniform timestamps", () => {
    const t = Float64Array.from({ length: 100 }, (_, i) => i * 10);
    const stats = computeTimingStats(t);
    expect(stats.count).toBe(100);
    expect(stats.meanHz).toBeCloseTo(100);
    expect(stats.meanIntervalMs).toBeCloseTo(10);
    expect(stats.jitterCv).toBeCloseTo(0);
    expect(stats.dropouts).toBe(0);
  });

  it("detects dropouts", () => {
    const t = [0, 10, 20, 200, 210];
    const stats = computeTimingStats(t, 50);
    expect(stats.dropouts).toBe(1);
  });

  it("handles empty input", () => {
    const stats = computeTimingStats([]);
    expect(stats.count).toBe(0);
    expect(stats.meanHz).toBe(0);
  });
});

describe("resample", () => {
  it("resamples to target rate", () => {
    const t = Float64Array.from({ length: 50 }, (_, i) => i * 20);
    const v = Float32Array.from({ length: 50 }, (_, i) => Math.sin(i * 0.1));
    const { t: tOut, values } = linearResample(t, v, 100);
    expect(tOut.length).toBeGreaterThan(0);
    expect(values.length).toBe(tOut.length);
    const dt = tOut[1]! - tOut[0]!;
    expect(dt).toBeCloseTo(10, 1);
  });

  it("produces NaN in gaps", () => {
    const t = [0, 10, 500, 510];
    const v = [1, 2, 3, 4];
    const { values } = linearResample(t, v, 100, 50);
    const hasNaN = Array.from(values).some((x) => Number.isNaN(x));
    expect(hasNaN).toBe(true);
  });
});

describe("filters", () => {
  it("lowpass attenuates high frequencies", () => {
    const sr = 1000;
    const n = 512;
    const signal = Float32Array.from({ length: n }, (_, i) => {
      const t = i / sr;
      return Math.sin(2 * Math.PI * 5 * t) + Math.sin(2 * Math.PI * 200 * t);
    });
    const coeffs = designBiquad("lowpass", sr, 20);
    const filtered = applyBiquad(coeffs, signal);
    const rmsHigh = rms(signal);
    const rmsFiltered = rms(filtered);
    expect(rmsFiltered).toBeLessThan(rmsHigh);
  });
});

describe("fft", () => {
  it("detects dominant frequency with parabolic interpolation", () => {
    const sr = 256;
    const n = 256;
    const freq = 10;
    const signal = Float32Array.from({ length: n }, (_, i) =>
      Math.sin(2 * Math.PI * freq * (i / sr)),
    );
    const result = realFftWithRate(signal, sr);
    expect(result.peakHz).toBeCloseTo(freq, 0);
  });
});

describe("events", () => {
  it("detects zero crossings in sine wave", () => {
    const n = 200;
    const t = Float64Array.from({ length: n }, (_, i) => i);
    const v = Float32Array.from({ length: n }, (_, i) =>
      Math.sin(2 * Math.PI * 2 * (i / n)),
    );
    const crossings = detectZeroCrossings(v, t);
    expect(crossings.length).toBeGreaterThanOrEqual(3);

    const hasRising = crossings.some((c) => c.direction === "rising");
    const hasFalling = crossings.some((c) => c.direction === "falling");
    expect(hasRising).toBe(true);
    expect(hasFalling).toBe(true);
  });

  it("detects free-fall windows", () => {
    const n = 500;
    const t = Float64Array.from({ length: n }, (_, i) => i * 2);
    const accel = Float32Array.from({ length: n }, (_, i) =>
      i >= 100 && i < 200 ? 0.5 : 9.81,
    );
    const windows = detectFreeFall(accel, t);
    expect(windows.length).toBe(1);
    expect(windows[0]!.durationMs).toBeGreaterThanOrEqual(100);
    expect(windows[0]!.meanAccel).toBeLessThan(2);
  });
});

describe("damping", () => {
  it("estimates decay from exponentially decaying peaks", () => {
    const decayRate = 0.002;
    const peaks = [10, 10 * Math.exp(-decayRate * 500), 10 * Math.exp(-decayRate * 1000)];
    const tPeaks = [0, 500, 1000];
    const est = estimateDamping(peaks, tPeaks);
    expect(est.decayRate).toBeCloseTo(decayRate, 4);
    expect(est.r2).toBeGreaterThan(0.99);
    expect(est.halfLifeMs).toBeCloseTo(Math.LN2 / decayRate, 0);
  });
});

describe("fit", () => {
  it("fits a perfect line", () => {
    const x = [0, 1, 2, 3, 4];
    const y = [2, 5, 8, 11, 14];
    const fit = linearFit(x, y);
    expect(fit.slope).toBeCloseTo(3);
    expect(fit.intercept).toBeCloseTo(2);
    expect(fit.r2).toBeCloseTo(1);
  });
});

describe("uncertainty", () => {
  it("computes mean and standard error", () => {
    const values = [10, 10.1, 9.9, 10.05, 9.95];
    const result = meanWithUncertainty(values);
    expect(result.value).toBeCloseTo(10, 1);
    expect(result.uncertainty).toBeGreaterThan(0);
    expect(result.relative).toBeGreaterThan(0);
  });

  it("propagates uncertainty through addition", () => {
    const a = { value: 10, uncertainty: 0.1, relative: 1 };
    const b = { value: 20, uncertainty: 0.2, relative: 1 };
    const sum = propagateAdd(a, b);
    expect(sum.value).toBeCloseTo(30);
    expect(sum.uncertainty).toBeCloseTo(Math.sqrt(0.01 + 0.04), 5);
  });
});

function rms(arr: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i]! ** 2;
  return Math.sqrt(sum / arr.length);
}
