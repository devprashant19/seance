import { defineExperiment, computeGateRpm } from "seance-core";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const gateRpm: LabExperimentDefinition = defineExperiment({
  id: "gate-rpm",
  name: "Apparition Gate: Stroboscopic Tachometer",
  spooky: "Spin the phantom wheel and reveal the stroboscopic illusion where motion freezes.",
  plain: "Measure rotation frequency and detect stroboscopic Nyquist aliasing.",
  channels: ["camera.gate"],
  inputs: [
    {
      key: "blades",
      label: "Number of fan blades / spokes",
      unit: "1",
      defaultValue: 3,
      defaultUncertainty: 0,
      min: 1,
      max: 12,
    },
    {
      key: "expectedMaxFreq",
      label: "Expected maximum frequency",
      unit: "Hz",
      defaultValue: 20,
      defaultUncertainty: 1,
      min: 1,
      max: 120,
    },
  ],
  safetyNote: "Do not touch rotating fan blades or machinery during optical measurement.",
  analyze(channels, inputs): ExperimentResult {
    const gateFrames = channels["camera.gate"] ?? [];
    const blades = inputs["blades"] ?? 3;
    const expectedMaxFreq = inputs["expectedMaxFreq"] ?? 20;

    const fps = gateFrames.length > 1
      ? 1000 / (((gateFrames[gateFrames.length - 1]?.t ?? 0) - (gateFrames[0]?.t ?? 0)) / (gateFrames.length - 1) || 33)
      : 30;

    const sig = gateFrames.map((f) => f.v[0] ?? 0);
    const rpmRes = computeGateRpm(sig, fps, blades, expectedMaxFreq);

    return {
      measured: rpmRes.rpm,
      uncertainty: Math.max(10, rpmRes.rpm * 0.05),
      reference: (expectedMaxFreq / blades) * 60,
      referenceUncertainty: 30,
      unit: "rpm",
      quantity: "omega",
    };
  },
});
