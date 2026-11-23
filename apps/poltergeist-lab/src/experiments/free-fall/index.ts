import { analyzeFreeFall } from "./analysis.js";
import { freeFallUncertainty } from "./uncertainty.js";
import type { ExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const freeFall: ExperimentDefinition = {
  id: "free-fall",
  name: "The Drop of Doom",
  spooky: "Release the spirit and let gravity reveal itself.",
  plain: "Measure fall height from free-fall duration.",
  channels: ["accelG"],
  inputs: [
    { key: "referenceH", label: "Known drop height", unit: "m", defaultValue: 0.5, defaultUncertainty: 0.005, min: 0.1, max: 10.0 },
    { key: "deltaT", label: "Timing uncertainty", unit: "s", defaultValue: 0.005, defaultUncertainty: 0, min: 0.001, max: 0.05 },
  ],
  safetyNote: "Drop the phone onto a soft surface (pillow, cushion). Do not drop from heights above 2m.",
  analyze(channels, inputs): ExperimentResult {
    const accel = channels["accelG"] ?? [];
    const referenceH = inputs["referenceH"] ?? 0.5;
    const deltaT = inputs["deltaT"] ?? 0.005;

    const result = analyzeFreeFall(accel);

    const sampleIntervalMs = accel.length > 1
      ? (accel[accel.length - 1]!.t - accel[0]!.t) / (accel.length - 1)
      : 20;

    const unc = freeFallUncertainty(
      result.h,
      result.fallTimeS || 0.001,
      deltaT,
      sampleIntervalMs,
    );

    return {
      measured: result.h,
      uncertainty: unc.deltaH,
      reference: referenceH,
      referenceUncertainty: 0.005,
      unit: "m",
      quantity: "h",
    };
  },
};

export { analyzeFreeFall } from "./analysis.js";
export { freeFallUncertainty } from "./uncertainty.js";
export { heightFromFallTime, fallTimeFromHeight } from "./theory.js";
