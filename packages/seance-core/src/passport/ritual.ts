/**
 * Guided calibration rituals checking invariant physical properties.
 */

import { detectZeroCrossings } from "../dsp/events.js";
import type { TraceChannel } from "../trace.js";

export type RitualStepKind = "flat" | "upright" | "rotate90" | "swing";

export interface RitualStepResult {
  readonly step: RitualStepKind;
  readonly passed: boolean;
  readonly measured: Record<string, number | string>;
  readonly message: string;
}

export function evaluateRitualStep(
  step: RitualStepKind,
  channels: readonly TraceChannel[],
): RitualStepResult {
  const accelG = channels.find((c) => c.id === "accelG");
  const gyro = channels.find((c) => c.id === "gyro");

  switch (step) {
    case "flat": {
      if (!accelG || accelG.t.length < 5 || accelG.data.length < 3) {
        return { step, passed: false, measured: {}, message: "accelG channel data missing or insufficient" };
      }
      const n = accelG.t.length;
      let sumZ = 0;
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < n; i++) {
        sumX += accelG.data[0]![i]!;
        sumY += accelG.data[1]![i]!;
        sumZ += accelG.data[2]![i]!;
      }
      const meanX = sumX / n;
      const meanY = sumY / n;
      const meanZ = sumZ / n;
      const zSign = Math.sign(meanZ);
      const passed = Math.abs(Math.abs(meanZ) - 9.81) < 1.5 && Math.abs(meanX) < 2.0 && Math.abs(meanY) < 2.0;

      return {
        step,
        passed,
        measured: {
          meanX: Number(meanX.toFixed(2)),
          meanY: Number(meanY.toFixed(2)),
          meanZ: Number(meanZ.toFixed(2)),
          zSign: zSign >= 0 ? "+z" : "-z",
        },
        message: passed
          ? `Flat invariant verified: gravity along z (${zSign > 0 ? "+" : "-"}9.81 m/s²).`
          : `Flat check failed: expected gravity on z, got x=${meanX.toFixed(1)}, y=${meanY.toFixed(1)}, z=${meanZ.toFixed(1)} m/s².`,
      };
    }

    case "upright": {
      if (!accelG || accelG.t.length < 5 || accelG.data.length < 3) {
        return { step, passed: false, measured: {}, message: "accelG channel data missing or insufficient" };
      }
      const n = accelG.t.length;
      let sumY = 0;
      let sumX = 0;
      let sumZ = 0;
      for (let i = 0; i < n; i++) {
        sumX += accelG.data[0]![i]!;
        sumY += accelG.data[1]![i]!;
        sumZ += accelG.data[2]![i]!;
      }
      const meanX = sumX / n;
      const meanY = sumY / n;
      const meanZ = sumZ / n;
      const passed = Math.abs(Math.abs(meanY) - 9.81) < 2.0 && Math.abs(meanX) < 3.0 && Math.abs(meanZ) < 3.0;

      return {
        step,
        passed,
        measured: {
          meanX: Number(meanX.toFixed(2)),
          meanY: Number(meanY.toFixed(2)),
          meanZ: Number(meanZ.toFixed(2)),
        },
        message: passed
          ? `Upright invariant verified: gravity dominantly on y (${meanY.toFixed(1)} m/s²).`
          : `Upright check failed: expected gravity on y, got y=${meanY.toFixed(1)} m/s².`,
      };
    }

    case "rotate90": {
      if (!gyro || gyro.t.length < 5 || gyro.data.length < 3) {
        return { step, passed: false, measured: {}, message: "gyro channel data missing or insufficient" };
      }
      const n = gyro.t.length;
      let integratedAngleRad = 0;
      for (let i = 0; i < n - 1; i++) {
        const dt = (gyro.t[i + 1]! - gyro.t[i]!) / 1000;
        const wZ = (gyro.data[2]![i]! + gyro.data[2]![i + 1]!) / 2;
        integratedAngleRad += wZ * dt;
      }
      const angleDeg = (integratedAngleRad * 180) / Math.PI;
      const passed = Math.abs(Math.abs(angleDeg) - 90) < 30; // within 30 degrees

      return {
        step,
        passed,
        measured: {
          integratedAngleDeg: Number(angleDeg.toFixed(1)),
          integratedAngleRad: Number(integratedAngleRad.toFixed(2)),
          direction: angleDeg > 0 ? "counter-clockwise" : "clockwise",
        },
        message: passed
          ? `90-degree rotation verified: integrated ${angleDeg.toFixed(1)}° (${integratedAngleRad.toFixed(2)} rad).`
          : `Rotation check failed: expected ±90°, integrated ${angleDeg.toFixed(1)}°.`,
      };
    }

    case "swing": {
      if (!gyro || gyro.t.length < 20 || gyro.data.length < 1) {
        return { step, passed: false, measured: {}, message: "gyro channel data missing or insufficient" };
      }
      const crossings = detectZeroCrossings(gyro.data[0]!, gyro.t, 0.1);
      const passed = crossings.length >= 4;

      return {
        step,
        passed,
        measured: {
          zeroCrossingCount: crossings.length,
        },
        message: passed
          ? `Swing invariant verified: ${crossings.length} periodic zero crossings observed.`
          : `Swing check failed: expected >= 4 zero crossings, found ${crossings.length}.`,
      };
    }
  }
}
