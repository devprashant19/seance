import { describe, it, expect } from "vitest";
import { SCALES } from "../src/audio/scales.js";
import { updateVoice, type BansheeState } from "../src/instrument/index.js";
import { padKey, PAD_KEYS } from "../src/instrument/banshee-voice.js";
import type { Voice } from "../src/audio/voice.js";

function fakeVoice() {
  const log = { freq: [] as number[], gate: [] as boolean[] };
  const voice: Voice = {
    setFrequency: (hz) => log.freq.push(hz),
    setCutoff: () => {},
    setTremolo: () => {},
    gateOn: () => log.gate.push(true),
    gateOff: () => log.gate.push(false),
    setPan: () => {},
    destroy: () => {},
  };
  return { voice, log };
}

const start: BansheeState = { scaleName: "graveyard", droneMode: false, currentNoteIndex: -1 };

describe("phone sing pad keys (like the laptop's A–K)", () => {
  it("splits the pad into 8 equal keys", () => {
    expect(PAD_KEYS).toBe(8);
    expect(padKey(0)).toBe(0);
    expect(padKey(0.124)).toBe(0);
    expect(padKey(0.126)).toBe(1);
    expect(padKey(0.99)).toBe(7);
    expect(padKey(1)).toBe(7);
  });

  it("the key under the finger picks the note (same notes as the laptop keys)", () => {
    const { voice, log } = fakeVoice();
    updateVoice(voice, { touch: { down: true, x: 0.3 }, orientation: { beta: 40, gamma: 0 } }, start);
    expect(log.freq.at(-1)).toBe(SCALES.graveyard[2]);
    expect(log.gate.at(-1)).toBe(true);
  });

  it("keeps the held key while the finger rests (batches without touch data), then tilt takes over after release", () => {
    const { voice, log } = fakeVoice();
    let s = updateVoice(voice, { touch: { down: true, x: 0.9 } }, start);
    s = updateVoice(voice, { orientation: { beta: -40, gamma: 0 } }, s); // no touch in this batch
    expect(log.freq.at(-1)).toBe(SCALES.graveyard[7]);
    s = updateVoice(voice, { touch: { down: false, x: 0.9 } }, s);
    updateVoice(voice, { orientation: { beta: -40, gamma: 0 } }, s);
    expect(log.freq.at(-1)).not.toBe(SCALES.graveyard[7]);
    expect(log.gate.at(-1)).toBe(false);
  });

  it("sliding across keys changes the note", () => {
    const { voice, log } = fakeVoice();
    let s = updateVoice(voice, { touch: { down: true, x: 0.05 } }, start);
    s = updateVoice(voice, { touch: { down: true, x: 0.55 } }, s);
    expect(log.freq).toEqual([SCALES.graveyard[0], SCALES.graveyard[4]]);
    expect(s.keyIndex).toBe(4);
  });
});
