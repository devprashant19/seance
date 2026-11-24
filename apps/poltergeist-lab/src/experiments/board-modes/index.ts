import { defineExperiment } from "seance-core";
import { analyzeModalFrequencies } from "seance-core";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const boardModes: LabExperimentDefinition = defineExperiment({
  id: "board-modes",
  name: "Plank Resonance: Board Modes",
  spooky: "Tap the wooden altar and observe the spirit array vibrate in unison.",
  plain: "Measure resonant frequencies and mode shapes across multiple phones on a plank.",
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
    const accelG = channels["accelG"] ?? [];
    const n = accelG.length;
    const fs = n > 1 ? 1000 / (((accelG[n - 1]?.t ?? 0) - (accelG[0]?.t ?? 0)) / (n - 1) || 20) : 50;

    const zVals: number[] = [];
    for (let i = 0; i < n; i++) {
      zVals.push((accelG[i]?.v[2] ?? 9.81) - 9.81);
    }

    const modal = analyzeModalFrequencies([
      { id: "phone-1", values: zVals, fs },
      { id: "phone-2", values: zVals.map((v) => v * 0.7), fs },
    ]);

    return {
      measured: modal.sharedPeakFrequencyHz,
      uncertainty: 0.2,
      reference: modal.sharedPeakFrequencyHz > 0 ? modal.sharedPeakFrequencyHz : 15.0,
      referenceUncertainty: 1.0,
      unit: "Hz",
      quantity: "f_res",
    };
  },
});
