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

    if (!(rpmRes.rpm > 0)) {
      throw new Error("No regular blade passes were seen in the gate. Point the gate box at the spinning blades and recalibrate with the fan off.");
    }
    // Frequency resolution of the recording sets the uncertainty: rpm = 60 · f_blade / blades.
    const durationS = gateFrames.length > 1 ? ((gateFrames[gateFrames.length - 1]?.t ?? 0) - (gateFrames[0]?.t ?? 0)) / 1000 : 0;
    const sigmaRpm = durationS > 0 ? (60 * (1 / durationS / 2)) / blades : rpmRes.rpm;
    // "Expected maximum frequency" is only the search limit, not a value to compare against.
    return {
      measured: rpmRes.rpm,
      uncertainty: sigmaRpm,
      reference: null,
      referenceUncertainty: 0,
      unit: "rpm",
      quantity: "omega",
    };
  },
});
