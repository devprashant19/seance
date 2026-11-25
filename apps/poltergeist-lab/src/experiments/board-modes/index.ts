import { defineExperiment } from "seance-core";
import { resampleUniform, spectrumPeaks } from "../spectrum.js";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const boardModes: LabExperimentDefinition = defineExperiment({
  id: "board-modes",
  name: "Plank Resonance: Board Modes",
  spooky: "Tap the wooden altar and observe the spirit array vibrate in unison.",
  plain: "Measure the strongest resonant frequency of a plank with a phone lying on it.",
  channels: ["accelG"],
  inputs: [
    {
      key: "plankLength",
      label: "Plank length",
      unit: "m",
      defaultValue: 1.2,
      defaultUncertainty: 0.01,
      min: 0.5,
      max: 3.0,
    },
    {
      key: "supportDistance",
      label: "Support span",
      unit: "m",
      defaultValue: 1.0,
      defaultUncertainty: 0.01,
      min: 0.4,
      max: 2.8,
    },
  ],
  safetyNote: "Rest the plank securely on supports. Phone mass lowers measured frequency.",
  analyze(channels) {
    const trace = resampleUniform(channels["accelG"] ?? [], (v) => v[2] ?? 0);
    if (trace.fs < 20 || trace.durationS < 2) {
      throw new Error("Too little motion data arrived to look for a resonance. Keep the phone's join page open and retry.");
    }
    // A phone can only see vibrations below half its sample rate (Nyquist).
    const nyquist = trace.fs / 2;
    const spec = spectrumPeaks(trace, 2, nyquist * 0.95);
    const top = spec.peaks[0];
    // Also require a physically noticeable vibration (≈ 0.02 m/s² amplitude), not just a ratio over silence.
    if (!top || top.magnitude < 6 * spec.noiseFloor || top.magnitude < 0.005) {
      throw new Error(
        `No clear ringing found. Tap the plank firmly near its middle a few times while recording. ` +
          `Note: this phone samples at about ${Math.round(trace.fs)} Hz, so it can only see vibrations below ` +
          `about ${Math.round(nyquist)} Hz; stiffer or shorter planks ring higher than that.`,
      );
    }
    // No accepted value exists for this particular plank: report the measurement, not a pass/fail.
    return {
      measured: top.hz,
      uncertainty: spec.resolutionHz / 2,
      reference: null,
      referenceUncertainty: 0,
      unit: "Hz",
      quantity: "strongest resonance",
    };
  },
});
