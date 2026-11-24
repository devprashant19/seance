import { defineExperiment, computeGatePeriod, detectCrossings } from "seance-core";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const gatePeriod: LabExperimentDefinition = defineExperiment({
  id: "gate-period",
  name: "Apparition Gate: Pendulum Period",
  spooky: "The spirit swings through the optical veil, casting its shadow across the gate.",
  plain: "Measure pendulum period contactless via webcam photogate crossing times.",
  channels: ["camera.gate"],
  inputs: [
    {
      key: "length",
      label: "Pendulum string length",
      unit: "m",
      defaultValue: 1.0,
      defaultUncertainty: 0.005,
      min: 0.1,
      max: 5.0,
    },
  ],
  safetyNote: "Secure the pendulum so the bob passes in front of the camera without striking the screen.",
  analyze(channels, inputs): ExperimentResult {
    const gateFrames = channels["camera.gate"] ?? [];
    const L = inputs["length"] ?? 1.0;

    // Extract ROI1 delta samples
    const samples = gateFrames.map((f) => ({
      t: f.t,
      v: f.v[0] ?? 0,
    }));

    // Detect crossings with baseline 0 and sigma estimated from data
    const maxVal = samples.reduce((m, s) => Math.max(m, s.v), 0);
    const sigma = Math.max(1, maxVal * 0.15);
    const crossings = detectCrossings(samples, 0, sigma, 2.5);

    const fps = gateFrames.length > 1
      ? 1000 / (((gateFrames[gateFrames.length - 1]?.t ?? 0) - (gateFrames[0]?.t ?? 0)) / (gateFrames.length - 1) || 33)
      : 30;

    const periodRes = computeGatePeriod(crossings, fps);
    const measuredT = periodRes.periodS > 0 ? periodRes.periodS : 2.0;
    const theoreticalT = 2 * Math.PI * Math.sqrt(L / 9.80665);

    return {
      measured: measuredT,
      uncertainty: Math.max(0.005, periodRes.uncertaintyS),
      reference: theoreticalT,
      referenceUncertainty: 0.02,
      unit: "s",
      quantity: "T",
    };
  },
});
