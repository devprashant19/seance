const A3 = 220;

function semitoneToFreq(root: number, semitones: number): number {
  return root * Math.pow(2, semitones / 12);
}

function buildScale(root: number, intervals: readonly number[], octaves: number): readonly number[] {
  const notes: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      notes.push(semitoneToFreq(root, interval + oct * 12));
    }
  }
  return notes;
}

export const SCALES = {
  graveyard: buildScale(A3, [0, 3, 5, 7, 10], 3),
  crypt: buildScale(A3, [0, 1, 4, 5, 7, 8, 10], 3),
  fog: buildScale(A3, [0, 2, 3, 5, 7, 9, 10], 3),
} as const;

export type ScaleName = keyof typeof SCALES;

export const SCALE_NAMES: readonly ScaleName[] = ["graveyard", "crypt", "fog"];

const HYSTERESIS_DEADBAND = 0.15;

export function snapToScale(
  pitchNorm: number,
  scaleName: ScaleName,
  currentNoteIndex?: number,
): { frequency: number; noteIndex: number } {
  const scale = SCALES[scaleName];
  const clamped = Math.max(0, Math.min(1, pitchNorm));
  const rawIndex = clamped * (scale.length - 1);

  if (currentNoteIndex !== undefined && currentNoteIndex >= 0 && currentNoteIndex < scale.length) {
    const diff = Math.abs(rawIndex - currentNoteIndex);
    if (diff < HYSTERESIS_DEADBAND) {
      return { frequency: scale[currentNoteIndex]!, noteIndex: currentNoteIndex };
    }
  }

  const noteIndex = Math.round(rawIndex);
  const clampedIndex = Math.max(0, Math.min(scale.length - 1, noteIndex));
  return { frequency: scale[clampedIndex]!, noteIndex: clampedIndex };
}
