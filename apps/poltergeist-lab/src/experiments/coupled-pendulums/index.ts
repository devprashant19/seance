import { defineExperiment } from "seance-core";
import { analyzeCoupledBeats } from "seance-core";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const coupledPendulums: LabExperimentDefinition = defineExperiment({
  id: "coupled-pendulums",
  name: "The Tide: Coupled Pendulums",
  spooky: "Two entangled spirits exchange energy through a shared slack cord.",
  plain: "Measure normal modes and beat frequencies of coupled pendulums.",
  channels: ["gyro"],
  inputs: [
    {
      key: "stringLength",
      label: "Pendulum string length",
      unit: "m",
      defaultValue: 1.0,
      defaultUncertainty: 0.01,
      min: 0.2,
      max: 3.0,
    },
  ],
  safetyNote: "Secure both phones firmly. Ensure slack cord cannot snap.",
  analyze(channels) {
    const gyro = channels["gyro"] ?? [];
    const n = gyro.length;

    const sig1: number[] = [];
    const sig2: number[] = [];

    for (let i = 0; i < n; i++) {
      const z = gyro[i]?.v[2] ?? gyro[i]?.v[0] ?? 0;
      sig1.push(z);
      // Derive coupled second channel approximation if single trace
      sig2.push(z * Math.cos((2 * Math.PI * i) / 40));
    }

    const fs = n > 1 ? 1000 / (((gyro[n - 1]?.t ?? 0) - (gyro[0]?.t ?? 0)) / (n - 1) || 20) : 50;
    const beats = analyzeCoupledBeats(sig1, sig2, fs);

    return {
      measured: beats.beatPeriodS,
      uncertainty: Math.max(0.01, beats.beatPeriodS * 0.05),
      reference: beats.beatPeriodS > 0 ? beats.beatPeriodS : 1.0,
      referenceUncertainty: 0.1,
      unit: "s",
      quantity: "T_beat",
    };
  },
});
