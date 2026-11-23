import { describe, it, expect } from "vitest";
import {
  butterworthLowpass,
  sliderToCutoff,
  attenuationAtFreq,
  detectSignalFrequency,
} from "../src/features/exorcism/filter.js";

function generateSine(freqHz: number, sampleRateHz: number, durationS: number): number[] {
  const n = Math.floor(sampleRateHz * durationS);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.sin(2 * Math.PI * freqHz * i / sampleRateHz));
  }
  return out;
}

function zeroCrossings(signal: readonly number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < signal.length; i++) {
    if ((signal[i - 1]! < 0 && signal[i]! >= 0) || (signal[i - 1]! >= 0 && signal[i]! < 0)) {
      crossings.push(i);
    }
  }
  return crossings;
}

describe("butterworthLowpass", () => {
  it("preserves zero crossings for a low-frequency sine with high cutoff", () => {
    const signal = generateSine(2, 50, 2);
    const result = butterworthLowpass(signal, 50, 10);

    const rawCrossings = zeroCrossings(signal);
    const filteredCrossings = zeroCrossings([...result.filtered]);

    expect(filteredCrossings.length).toBe(rawCrossings.length);
    for (let i = 0; i < rawCrossings.length; i++) {
      expect(Math.abs(filteredCrossings[i]! - rawCrossings[i]!)).toBeLessThanOrEqual(1);
    }
  });

  it("attenuates high-frequency noise by more than 90%", () => {
    const noise = generateSine(20, 50, 1);
    const result = butterworthLowpass(noise, 50, 5);

    const rmsRatio = result.rmsFiltered / result.rmsRaw;
    expect(rmsRatio).toBeLessThan(0.1);
  });

  it("returns unmodified signal when cutoff exceeds Nyquist", () => {
    const signal = generateSine(5, 100, 0.5);
    const result = butterworthLowpass(signal, 100, 55);

    expect(result.rmsRemoved).toBe(0);
    expect(result.filtered).toEqual(signal);
  });
});

describe("sliderToCutoff", () => {
  it("returns fMax at s=0 and fMin at s=1", () => {
    const atZero = sliderToCutoff(0, 1, 25);
    const atOne = sliderToCutoff(1, 1, 25);

    expect(atZero).toBeCloseTo(25, 1);
    expect(atOne).toBeCloseTo(1, 1);
  });

  it("returns a value between fMin and fMax for s=0.5", () => {
    const mid = sliderToCutoff(0.5, 1, 25);
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(25);
  });
});

describe("attenuationAtFreq", () => {
  it("gives ~29.3% reduction at the cutoff frequency for 2nd-order Butterworth", () => {
    const { amplitudeReductionPct } = attenuationAtFreq(10, 10);
    expect(amplitudeReductionPct).toBeCloseTo(29.3, 0);
  });

  it("gives near 0% reduction far below cutoff", () => {
    const { amplitudeReductionPct } = attenuationAtFreq(100, 1);
    expect(amplitudeReductionPct).toBeLessThan(1);
  });

  it("gives high reduction far above cutoff", () => {
    const { amplitudeReductionPct } = attenuationAtFreq(5, 50);
    expect(amplitudeReductionPct).toBeGreaterThan(90);
  });
});

describe("detectSignalFrequency", () => {
  it("detects a 5 Hz sine at 100 Hz sample rate", () => {
    const signal = generateSine(5, 100, 2);
    const freq = detectSignalFrequency(signal, 100);
    expect(freq).toBeCloseTo(5, 0);
  });

  it("detects a 10 Hz sine at 200 Hz sample rate", () => {
    const signal = generateSine(10, 200, 1);
    const freq = detectSignalFrequency(signal, 200);
    expect(freq).toBeCloseTo(10, 0);
  });

  it("returns 0 for a constant signal", () => {
    const signal = new Array(100).fill(5);
    const freq = detectSignalFrequency(signal, 100);
    expect(freq).toBe(0);
  });
});
