import { snapToScale, tiltToPitch, rollToCutoff, shakeToTremolo, type ScaleName } from "../audio/index.js";
import type { Voice } from "../audio/voice.js";

export interface BansheeState {
  scaleName: ScaleName;
  droneMode: boolean;
  currentNoteIndex: number;
}

export interface SensorFrame {
  orientation?: { beta: number; gamma: number };
  accel?: { x: number; y: number; z: number };
  touch?: { down: boolean };
}

export function updateVoice(
  voice: Voice,
  frame: SensorFrame,
  state: BansheeState,
): BansheeState {
  let { currentNoteIndex } = state;

  if (frame.orientation) {
    const pitchNorm = tiltToPitch(frame.orientation.beta);
    const snap = snapToScale(pitchNorm, state.scaleName, currentNoteIndex);
    voice.setFrequency(snap.frequency);
    currentNoteIndex = snap.noteIndex;

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

  return { ...state, currentNoteIndex };
}
