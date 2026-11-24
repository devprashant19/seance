import { describe, it, expect } from "vitest";
import { resultSentence } from "seance-sonify";

describe("Ghost Ear Complete Multi-Experiment Sonification", () => {
  it("formats spoken sentence for free-fall with correct unit and uncertainty", () => {
    const s = resultSentence({
      label: "Fall height",
      value: 1.25,
      uncertainty: 0.04,
      unit: "m",
    });
    expect(s).toContain("Fall height: 1.25 plus or minus 0.04 metres");
  });

  it("formats spoken sentence for singing-ruler with frequency and youngs modulus", () => {
    const s = resultSentence({
      label: "Fundamental frequency f1",
      value: 125.4,
      uncertainty: 1.5,
      unit: "Hz",
    });
    expect(s).toContain("Fundamental frequency f1: 125.4 plus or minus 1.5 hertz");
  });

  it("formats spoken sentence for spin-find-chip with radial distance", () => {
    const s = resultSentence({
      label: "Chip radial offset",
      value: 3.4,
      uncertainty: 0.2,
      unit: "cm",
    });
    expect(s).toContain("Chip radial offset: 3.4 plus or minus 0.2 cm");
  });
});
