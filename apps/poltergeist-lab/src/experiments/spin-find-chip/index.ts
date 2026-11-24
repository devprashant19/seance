import { defineExperiment } from "seance-core";
import { analyzeSpinFindChip } from "./analysis.js";
import { spinUncertainty } from "./uncertainty.js";
import type { ExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const spinFindChip: ExperimentDefinition = defineExperiment({
  id: "spin-find-chip",
  name: "Where Does the Spirit Live?",
  spooky: "The spirit hides inside your phone. Spin to find its seat.",
  plain: "Locate the IMU sensor inside the phone using centrifugal acceleration during a spin.",
  channels: ["gyro", "accelG"],
  inputs: [
    { key: "phoneWidth", label: "Phone width", unit: "m", defaultValue: 0.071, defaultUncertainty: 0.001, min: 0.05, max: 0.1 },
    { key: "phoneHeight", label: "Phone height", unit: "m", defaultValue: 0.147, defaultUncertainty: 0.001, min: 0.1, max: 0.2 },
  ],
  safetyNote: "Spin gently on a table, away from the edge. Not on glass.",
  analyze(channels, inputs): ExperimentResult {
    const gyro = channels["gyro"] ?? [];
    const accel = channels["accelG"] ?? channels["accel"] ?? [];
    const phoneWidth = inputs["phoneWidth"] ?? 0.071;
    const phoneHeight = inputs["phoneHeight"] ?? 0.147;

    const result = analyzeSpinFindChip(gyro, accel, phoneWidth, phoneHeight);

    const unc = spinUncertainty(result.estimates, result.rx, result.ry);

    return {
      measured: result.distance,
      uncertainty: unc.deltaR,
      reference: 0,
      referenceUncertainty: 0,
      unit: "m",
      quantity: "|r|",
    };
  },
});

export { analyzeSpinFindChip } from "./analysis.js";
export { spinUncertainty } from "./uncertainty.js";
export { totalAccel, solvePosition, steadyStatePosition, distanceFromEdges } from "./theory.js";
