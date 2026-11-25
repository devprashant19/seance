import { defineExperiment } from "seance-core";
import { resampleUniform, spectrumPeaks, tapSegments } from "../spectrum.js";
import type { LabExperimentDefinition } from "../pendulum-g/index.js";
import type { ExperimentResult } from "../../oracle/types.js";

export const boardModes: LabExperimentDefinition = defineExperiment({
  id: "board-modes",
  name: "Plank Resonance: Board Modes",
  spooky: "Tap the wooden altar and observe the spirit array vibrate in unison.",
  plain: "Measure the strongest resonant frequency of a plank with a phone lying on it.",
  channels: ["accelG"],
  inputs: [
    {
      key: "plankLength",
      label: "Plank length",
      unit: "m",
      defaultValue: 1.2,
      defaultUncertainty: 0.01,
      min: 0.5,
      max: 3.0,
    },
    {
      key: "supportDistance",
      label: "Support span",
      unit: "m",
      defaultValue: 1.0,
      defaultUncertainty: 0.01,
      min: 0.4,
      max: 2.8,
    },
  ],
  safetyNote: "Rest the plank securely on supports. Phone mass lowers measured frequency.",
  analyze(channels) {
    const trace = resampleUniform(channels["accelG"] ?? [], (v) => v[2] ?? 0);
    if (trace.fs < 20 || trace.durationS < 2) {
      throw new Error("Too little motion data arrived to look for a resonance. Keep the phone's join page open and retry.");
    }
    // A phone can only see vibrations below half its sample rate (Nyquist).
    const nyquist = trace.fs / 2;
    const band: [number, number] = [2, nyquist * 0.95];
    const whole = spectrumPeaks(trace, band[0], band[1]);
    const top = whole.peaks[0];
    // Also require a physically noticeable vibration (≈ 0.02 m/s² amplitude), not just a ratio over silence.
    if (!top || top.magnitude < 6 * whole.noiseFloor || top.magnitude < 0.005) {
      throw new Error(
        `No clear ringing found. Tap the plank firmly near its middle a few times while recording. ` +
          `Note: this phone samples at about ${Math.round(trace.fs)} Hz, so it can only see vibrations below ` +
          `about ${Math.round(nyquist)} Hz; stiffer or shorter planks ring higher than that.`,
      );
    }
    // Measure each tap's ringing on its own: a spectrum of several taps together splits into lines
    // spaced by the tapping rate, which would bias the peak.
    const bursts = tapSegments(trace);
    const freqs = bursts
      .map((seg) => spectrumPeaks(seg, band[0], band[1]))
      .filter((sp) => sp.peaks[0] && sp.peaks[0].magnitude > 6 * sp.noiseFloor)
      .map((sp) => sp.peaks[0]!.hz)
      .filter((f) => Math.abs(f - top.hz) < 0.15 * top.hz + 1);
    const n = freqs.length;
    const measured = n > 0 ? freqs.reduce((a, b) => a + b, 0) / n : top.hz;
    const sd = n > 1 ? Math.sqrt(freqs.reduce((a, f) => a + (f - measured) ** 2, 0) / (n - 1)) : 0;
    const segRes = n > 0 ? 1 / Math.min(...bursts.map((b) => b.durationS)) : whole.resolutionHz;
    const uncertainty = Math.max(n > 1 ? sd / Math.sqrt(n) : 0, segRes / (2 * Math.sqrt(Math.max(n, 1))));
    // No accepted value exists for this particular plank: report the measurement, not a pass/fail.
    return {
      measured,
      uncertainty,
      reference: null,
      referenceUncertainty: 0,
      unit: "Hz",
      quantity: n > 0 ? `strongest resonance (${n} tap${n === 1 ? "" : "s"})` : "strongest resonance",
    };
  },
});
