import { defineExperiment } from "seance-core";
import { resampleUniform, spectrumPeaks } from "../spectrum.js";
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
  recordSeconds: 40,
  analyze(channels, inputs) {
    const gyro = channels["gyro"] ?? [];
    // The swing axis depends on how the phone hangs: use the gyro axis with the most motion.
    const traces = [0, 1, 2].map((axis) => resampleUniform(gyro, (v) => v[axis] ?? 0));
    const variance = (x: Float64Array) => {
      let m = 0;
      for (const v of x) m += v;
      m /= x.length || 1;
      let s = 0;
      for (const v of x) s += (v - m) ** 2;
      return s / (x.length || 1);
    };
    const trace = traces.reduce((best, t) => (variance(t.values) > variance(best.values) ? t : best));
    if (trace.fs < 10 || trace.durationS < 5) {
      throw new Error("Too little gyro data arrived. Keep the phone's join page open for the whole recording.");
    }

    // Each bob's motion contains both normal modes; the beat period is 1 / (f2 − f1).
    const spec = spectrumPeaks(trace, 0.2, 3);
    const strong = spec.peaks.filter((p) => p.magnitude > Math.max(4 * spec.noiseFloor, 0.002));
    const first = strong[0];
    const second = strong.find((p) => first && Math.abs(p.hz - first.hz) >= 1.5 * spec.resolutionHz);
    if (!first || !second) {
      throw new Error(
        first
          ? `Only one swing frequency (${first.hz.toFixed(2)} Hz) was found, so no beat could be measured. The beat ` +
              `may be longer than this ${Math.round(trace.durationS)} s recording, or the cord isn't coupling the ` +
              "pendulums: make it a little tighter, start only one pendulum, and record again."
          : "No pendulum swing was found. Hang the phone as one bob, start that pendulum swinging, then press Begin.",
      );
    }
    const f1 = Math.min(first.hz, second.hz);
    const f2 = Math.max(first.hz, second.hz);

    // Physics check: the in-phase mode swings at the plain pendulum frequency sqrt(g/L) / 2π.
    const L = inputs["stringLength"] ?? 1.0;
    const f0 = Math.sqrt(9.81 / L) / (2 * Math.PI);
    if (Math.abs(f1 - f0) / f0 > 0.3) {
      throw new Error(
        `The slower swing is ${f1.toFixed(2)} Hz, but a ${L.toFixed(2)} m pendulum should swing near ${f0.toFixed(2)} Hz. ` +
          "Check the string length you entered (measure to the middle of the phone) and that the phone is a bob.",
      );
    }

    const df = f2 - f1;
    const sigmaDf = Math.SQRT2 * (spec.resolutionHz / 2);
    // There is no accepted beat period without knowing the coupling strength: measurement only.
    return {
      measured: 1 / df,
      uncertainty: sigmaDf / (df * df),
      reference: null,
      referenceUncertainty: 0,
      unit: "s",
      quantity: `beat period (normal modes ${f1.toFixed(3)} Hz and ${f2.toFixed(3)} Hz)`,
    };
  },
});
