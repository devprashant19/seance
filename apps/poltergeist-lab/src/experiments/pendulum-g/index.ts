import { analyzePendulum } from "./analysis.js";
import { pendulumUncertainty } from "./uncertainty.js";
import type { ExperimentResult } from "../../oracle/types.js";

export interface ExperimentDefinition {
  readonly id: string;
  readonly name: string;
  readonly spooky: string;
  readonly plain: string;
  readonly channels: readonly string[];
  readonly inputs: readonly InputSpec[];
  readonly safetyNote: string;
  readonly analyze: (
    channels: Record<string, readonly { t: number; v: readonly number[] }[]>,
    inputs: Record<string, number>,
  ) => ExperimentResult;
}

export interface InputSpec {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly defaultValue: number;
  readonly defaultUncertainty: number;
  readonly min: number;
  readonly max: number;
}

export const pendulumG: ExperimentDefinition = {
  id: "pendulum-g",
  name: "The Swinging Spirit",
  spooky: "Let the spirit swing and reveal the pull of the Earth.",
  plain: "Measure gravitational acceleration g via pendulum oscillation.",
  channels: ["gyro", "accelG"],
  inputs: [
    { key: "length", label: "String length", unit: "m", defaultValue: 1.0, defaultUncertainty: 0.005, min: 0.1, max: 5.0 },
    { key: "phoneHeight", label: "Phone height", unit: "m", defaultValue: 0.15, defaultUncertainty: 0.01, min: 0.05, max: 0.3 },
    { key: "deltaL", label: "Length uncertainty", unit: "m", defaultValue: 0.005, defaultUncertainty: 0, min: 0.001, max: 0.05 },
  ],
  safetyNote: "Hold the string firmly. Keep bystanders clear of the swing path.",
  analyze(channels, inputs) {
    const gyro = channels["gyro"] ?? [];
    const L = inputs["length"] ?? 1.0;
    const hPhone = inputs["phoneHeight"] ?? 0.15;
    const deltaL = inputs["deltaL"] ?? 0.005;

    const result = analyzePendulum(gyro, { lengthM: L, phoneHeightM: hPhone });

    const deltaT = result.periodS > 0
      ? result.periodS / (result.cycleCount * 2 || 1) * 0.02
      : 0.01;

    const unc = pendulumUncertainty(L, deltaL, result.periodS || 1, deltaT, result.g);

    return {
      measured: result.g,
      uncertainty: unc.deltaG,
      reference: 9.81,
      referenceUncertainty: 0.001,
      unit: "m/s^2",
      quantity: "g",
    };
  },
};

export { analyzePendulum } from "./analysis.js";
export { pendulumUncertainty } from "./uncertainty.js";
export { period, gFromPeriod, correctedG, finiteAmplitudeCorrection, effectiveLength } from "./theory.js";
