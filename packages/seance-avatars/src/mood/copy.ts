import type { Mood } from "seance-core";

export interface MoodCopy {
  readonly spooky: string;
  readonly plain: string;
  readonly action: string;
}

export const MOOD_COPY: Record<Mood, MoodCopy> = {
  calm: {
    spooky: "The spirit rests peacefully.",
    plain: "Sensor data is stable and reliable.",
    action: "No action needed.",
  },
  uneasy: {
    spooky: "The spirit stirs uneasily…",
    plain: "Minor sensor jitter detected.",
    action: "Hold the phone steadier or move to a stable surface.",
  },
  restless: {
    spooky: "The spirit is agitated!",
    plain: "Significant data quality issues detected.",
    action: "Check your grip. Move away from magnetic interference.",
  },
  fading: {
    spooky: "The spirit is fading away…",
    plain: "Sensor data is unreliable or missing.",
    action: "Wake the phone screen. Check permissions and network.",
  },
};
