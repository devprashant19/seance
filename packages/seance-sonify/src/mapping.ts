import type { Mood } from "seance-core";

export interface SonifyRange {
  readonly min: number;
  readonly max: number;
}

export interface MapOptions {
  readonly mood?: Mood;
  readonly fmin?: number;
  readonly fmax?: number;
}

export interface ToneParams {
  readonly freqHz: number;
  readonly pan: number;
  readonly gain: number;
  readonly tremoloDepth: number;
  readonly tremoloHz: number;
  readonly detuneCents: number;
  readonly noiseGain: number;
}

const DEFAULT_FMIN = 220; // A3
const DEFAULT_FMAX = 1320; // E6
const DEFAULT_TREMOLO_HZ = 6;

export function mapToTone(
  x: number,
  range: SonifyRange,
  sigma?: number,
  opts?: MapOptions,
): ToneParams {
  const fmin = opts?.fmin ?? DEFAULT_FMIN;
  const fmax = opts?.fmax ?? DEFAULT_FMAX;
  const mood = opts?.mood ?? "calm";

  const min = Number.isFinite(range.min) ? range.min : 0;
  const max = Number.isFinite(range.max) ? range.max : 1;
  const span = Math.max(1e-9, max - min);

  let u = 0.5;
  if (Number.isFinite(x) && max > min) {
    u = Math.max(0, Math.min(1, (x - min) / span));
  }

  // Logarithmic pitch mapping: perceptually even across octaves
  const freqHz = fmin * Math.pow(fmax / fmin, u);

  // Stereo pan: -1.0 (left) to +1.0 (right)
  const pan = Math.max(-1, Math.min(1, 2 * u - 1));

  // Uncertainty maps to tremolo depth (0.0 to 0.45)
  const s = typeof sigma === "number" && Number.isFinite(sigma) && sigma >= 0 ? sigma : 0;
  const tremoloDepth = Math.min(0.45, Math.max(0, (2.5 * s) / span));

  // Health mood influences detuning and acoustic texture
  let detuneCents = 0;
  let noiseGain = 0;
  let moodGainMultiplier = 1.0;

  switch (mood) {
    case "calm":
      detuneCents = 0;
      noiseGain = 0;
      moodGainMultiplier = 1.0;
      break;
    case "uneasy":
      detuneCents = 5;
      noiseGain = 0.05;
      moodGainMultiplier = 0.9;
      break;
    case "restless":
      detuneCents = 12;
      noiseGain = 0.15;
      moodGainMultiplier = 0.8;
      break;
    case "fading":
      detuneCents = 0;
      noiseGain = 0;
      moodGainMultiplier = 0.5; // -6 dB volume dip
      break;
  }

  const gain = 0.4 * moodGainMultiplier;

  return {
    freqHz,
    pan,
    gain,
    tremoloDepth,
    tremoloHz: DEFAULT_TREMOLO_HZ,
    detuneCents,
    noiseGain,
  };
}
