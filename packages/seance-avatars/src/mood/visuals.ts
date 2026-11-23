import type { Mood } from "seance-core";

export interface MoodVisualConfig {
  readonly glow: number;
  readonly opacity: number;
  readonly lanternScale: number;
  readonly hue: number;
  readonly twitchRate: number;
  readonly floatFreq: number;
  readonly floatAmp: number;
  readonly hemWobbleSpeed: number;
}

const BASE_CONFIGS: Record<Mood, Omit<MoodVisualConfig, "lanternScale">> = {
  calm: {
    glow: 1.0,
    opacity: 0.95,
    hue: 165,
    twitchRate: 0,
    floatFreq: 0.3,
    floatAmp: 0.02,
    hemWobbleSpeed: 0.5,
  },
  uneasy: {
    glow: 0.7,
    opacity: 0.9,
    hue: 45,
    twitchRate: 0.5,
    floatFreq: 0.5,
    floatAmp: 0.03,
    hemWobbleSpeed: 1.0,
  },
  restless: {
    glow: 0.65,
    opacity: 0.9,
    hue: 15,
    twitchRate: 2.0,
    floatFreq: 0.8,
    floatAmp: 0.05,
    hemWobbleSpeed: 2.0,
  },
  fading: {
    glow: 0.2,
    opacity: 0.15,
    hue: 260,
    twitchRate: 0,
    floatFreq: 0.1,
    floatAmp: 0.01,
    hemWobbleSpeed: 0.2,
  },
};

export function moodVisuals(
  mood: Mood,
  rateHz = 60,
  nominalRateHz = 60,
): MoodVisualConfig {
  const base = BASE_CONFIGS[mood];
  const lanternScale = Math.max(0.2, Math.min(1.0, rateHz / nominalRateHz));
  return { ...base, lanternScale };
}
