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

    // No usable spin: say so instead of reporting a distance of 0.
    if (result.spinsUsed === 0) {
      throw new Error(
        result.spinsRejected > 0
          ? `Found ${result.spinsRejected} spin(s), but all were rejected (the phone wobbled or the gyro saturated). ` +
              "Lay it flat on a smooth table and give it a gentle spin so it turns in place."
          : "No spin detected. Lay the phone flat, press Begin, then give it a gentle spin so it keeps turning in place for a few seconds.",
      );
    }

    const unc = spinUncertainty(result.estimates, result.rx, result.ry);

    // Physics check: the sensor has to be inside the phone. (Assumes the phone spun about its middle.)
    const marginMm = 2 * unc.deltaR * 1000;
    const inside =
      result.fromLeftMm > -marginMm && result.fromLeftMm < phoneWidth * 1000 + marginMm &&
      result.fromTopMm > -marginMm && result.fromTopMm < phoneHeight * 1000 + marginMm;
    if (!inside) {
      throw new Error(
        `This spin puts the sensor ${(result.distance * 100).toFixed(1)} cm from the spin centre — outside a ` +
          `${(phoneWidth * 100).toFixed(1)} × ${(phoneHeight * 100).toFixed(1)} cm phone. The phone probably spun around ` +
          "a point near its edge or slid across the table. Spin it so it turns in place around its middle, then try again.",
      );
    }

    // There is no accepted value for where the chip sits in *this* phone, so this is a measurement,
    // not a pass/fail against a reference.
    return {
      measured: result.distance,
      uncertainty: unc.deltaR,
      reference: null,
      referenceUncertainty: 0,
      unit: "m",
      quantity: `sensor offset from spin centre (${result.fromLeftMm.toFixed(0)} mm from left, ${result.fromTopMm.toFixed(0)} mm from top)`,
    };
  },
});

export { analyzeSpinFindChip } from "./analysis.js";
export { spinUncertainty } from "./uncertainty.js";
export { totalAccel, solvePosition, steadyStatePosition, distanceFromEdges } from "./theory.js";
