import { SCALES, snapToScale, tiltToPitch, rollToCutoff, shakeToTremolo, type ScaleName } from "../audio/index.js";
import type { Voice } from "../audio/voice.js";

/** Keys across the phone's sing pad — the same 8 notes as the laptop's A–K keys. */
export const PAD_KEYS = 8;

export interface BansheeState {
  scaleName: ScaleName;
  droneMode: boolean;
  currentNoteIndex: number;
  /** Pad key under the finger (0–7), or -1 when not touching. Phones only send touches on change. */
  keyIndex?: number;
}

/** Which of the 8 pad keys a horizontal touch position (0 = left, 1 = right) falls on. */
export function padKey(x: number): number {
  return Math.max(0, Math.min(PAD_KEYS - 1, Math.floor(x * PAD_KEYS)));
}

export interface SensorFrame {
  orientation?: { beta: number; gamma: number };
  accel?: { x: number; y: number; z: number };
  touch?: { down: boolean; x?: number };
}

export function updateVoice(
  voice: Voice,
  frame: SensorFrame,
  state: BansheeState,
): BansheeState {
  let { currentNoteIndex } = state;
  let keyIndex = state.keyIndex ?? -1;
  if (frame.touch) keyIndex = frame.touch.down && typeof frame.touch.x === "number" ? padKey(frame.touch.x) : -1;

  if (keyIndex >= 0) {
    // A finger on a pad key picks the note, like the laptop's A–K keys (slide to change notes).
    const scale = SCALES[state.scaleName];
    const i = Math.min(keyIndex, scale.length - 1);
    voice.setFrequency(scale[i]!);
    currentNoteIndex = i;
  } else if (frame.orientation) {
    const pitchNorm = tiltToPitch(frame.orientation.beta);
    const snap = snapToScale(pitchNorm, state.scaleName, currentNoteIndex);
    voice.setFrequency(snap.frequency);
    currentNoteIndex = snap.noteIndex;
  }

  if (frame.orientation) {
    const cutoff = rollToCutoff(frame.orientation.gamma);
    voice.setCutoff(cutoff);
  }

  if (frame.accel) {
    const mag = Math.sqrt(
      frame.accel.x ** 2 + frame.accel.y ** 2 + frame.accel.z ** 2,
    );
    const tremolo = shakeToTremolo(mag);
    voice.setTremolo(tremolo.depth, tremolo.rate);

    if (state.droneMode) {
      const gateThreshold = 2.0;
      if (mag > gateThreshold) {
        voice.gateOn();
      } else {
        voice.gateOff();
      }
    }
  }

  if (frame.touch && !state.droneMode) {
    if (frame.touch.down) {
      voice.gateOn();
    } else {
      voice.gateOff();
    }
  }

  return { ...state, currentNoteIndex, keyIndex };
}
