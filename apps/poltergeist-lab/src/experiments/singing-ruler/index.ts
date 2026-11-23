import { analyzeSingingRuler } from "./analysis.js";
import { singingRulerUncertainty } from "./uncertainty.js";
import type { ExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

const STEEL_E_REF = 200e9;
const STEEL_DENSITY = 7850;

export const singingRuler: ExperimentDefinition = {
  id: "singing-ruler",
  name: "Hear the Stiffness",
  spooky: "Let the spirit sing and reveal what the ruler is made of.",
  plain: "Measure Young's modulus E from cantilever acoustic resonance.",
  channels: ["audio.spectrum"],
  inputs: [
    { key: "thickness", label: "Ruler thickness", unit: "m", defaultValue: 0.001, defaultUncertainty: 0.0001, min: 0.0003, max: 0.01 },
    { key: "length", label: "Overhang length", unit: "m", defaultValue: 0.2, defaultUncertainty: 0.002, min: 0.05, max: 1.0 },
    { key: "density", label: "Material density", unit: "kg/m^3", defaultValue: STEEL_DENSITY, defaultUncertainty: 50, min: 500, max: 20000 },
    { key: "deltaH", label: "Thickness uncertainty", unit: "m", defaultValue: 0.0001, defaultUncertainty: 0, min: 0.00001, max: 0.001 },
    { key: "deltaL", label: "Length uncertainty", unit: "m", defaultValue: 0.002, defaultUncertainty: 0, min: 0.0005, max: 0.01 },
  ],
  safetyNote: "Clamp the ruler firmly to a table edge. Keep fingers clear of the vibrating end.",
  analyze(channels, inputs): ExperimentResult {
    const spectrum = channels["audio.spectrum"] ?? [];

    const spectrumFrames = spectrum.map((s) => {
      const half = Math.floor(s.v.length / 2);
      const frequencies = Array.from({ length: half }, (_, i) => i * 4);
      const magnitudes = s.v.slice(0, half);
      return { t: s.t, frequencies, magnitudes };
    });

    const h = inputs["thickness"] ?? 0.001;
    const L = inputs["length"] ?? 0.2;
    const rho = inputs["density"] ?? STEEL_DENSITY;
    const deltaH = inputs["deltaH"] ?? 0.0001;
    const deltaL = inputs["deltaL"] ?? 0.002;

    const result = analyzeSingingRuler(spectrumFrames, {
      thicknessM: h,
      lengthM: L,
      densityKgM3: rho,
    });

    const freqResolution = spectrumFrames.length > 0 && spectrumFrames[0]!.frequencies.length > 1
      ? (spectrumFrames[0]!.frequencies[1] ?? 0) - (spectrumFrames[0]!.frequencies[0] ?? 0)
      : 4;
    const deltaF = freqResolution / 2;

    const unc = singingRulerUncertainty(
      result.E || 1,
      h,
      deltaH,
      L,
      deltaL,
      result.f1 || 1,
      deltaF,
    );

    return {
      measured: result.E,
      uncertainty: unc.deltaE,
      reference: STEEL_E_REF,
      referenceUncertainty: 10e9,
      unit: "Pa",
      quantity: "E",
    };
  },
};

export { analyzeSingingRuler } from "./analysis.js";
export { singingRulerUncertainty } from "./uncertainty.js";
export { cantileverFrequency, youngsModulusFromFrequency } from "./theory.js";
