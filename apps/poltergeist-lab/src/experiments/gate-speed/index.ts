import { defineExperiment, computeGateSpeed } from "seance-core";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const gateSpeed: LabExperimentDefinition = defineExperiment({
  id: "gate-speed",
  name: "Apparition Gate: Speed of the Shadow",
  spooky: "A phantom dart flies between two optical shrines. Measure how swiftly it passes.",
  plain: "Measure linear speed of an object crossing two regions of interest.",
  channels: ["camera.gate"],
  inputs: [
    {
      key: "distance",
      label: "Gate separation distance",
      unit: "m",
      defaultValue: 0.2,
      defaultUncertainty: 0.002,
      min: 0.02,
      max: 2.0,
    },
  ],
  safetyNote: "Ensure moving objects remain on tracks and cannot strike the camera or persons.",
  analyze(channels, inputs): ExperimentResult {
    const gateFrames = channels["camera.gate"] ?? [];
    const distM = inputs["distance"] ?? 0.2;
    const distUncM = 0.002;

    const fps = gateFrames.length > 1
      ? 1000 / (((gateFrames[gateFrames.length - 1]?.t ?? 0) - (gateFrames[0]?.t ?? 0)) / (gateFrames.length - 1) || 33)
      : 30;

    // Find peak timestamps in ROI1 and ROI2
    let max1 = 0;
    let t1 = gateFrames[0]?.t ?? 0;
    let max2 = 0;
    let t2 = gateFrames[0]?.t ?? 0;

    for (const f of gateFrames) {
      const v1 = f.v[0] ?? 0;
      const v2 = f.v[1] ?? 0;
      if (v1 > max1) {
        max1 = v1;
        t1 = f.t;
      }
      if (v2 > max2) {
        max2 = v2;
        t2 = f.t;
      }
    }

    const dtMs = Math.abs(t2 - t1);
    const speedRes = computeGateSpeed(t1, dtMs > 10 ? t2 : t1 + 100, distM, distUncM, fps);

    return {
      measured: speedRes.speedMPerS,
      uncertainty: speedRes.uncertaintyMPerS,
      reference: speedRes.speedMPerS > 0 ? speedRes.speedMPerS : 1.0,
      referenceUncertainty: 0.05,
      unit: "m/s",
      quantity: "v",
    };
  },
});
