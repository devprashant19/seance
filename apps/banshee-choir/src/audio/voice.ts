interface FormantPreset {
  f1: number;
  f2: number;
}

const FORMANT_PRESETS: readonly FormantPreset[] = [
  { f1: 300, f2: 870 },
  { f1: 730, f2: 1090 },
  { f1: 270, f2: 2290 },
];

const VIBRATO_RATE = 5.5;
const VIBRATO_DEPTH_CENTS = 12;
const DETUNE_CENTS_B = 7;
const ATTACK_S = 0.04;
const RELEASE_S = 0.15;
const SMOOTH_TC = 0.016;

export interface Voice {
  setFrequency(hz: number): void;
  setCutoff(hz: number): void;
  setTremolo(depth: number, rate: number): void;
  gateOn(): void;
  gateOff(): void;
  setPan(value: number): void;
  destroy(): void;
}

export function createVoice(
  ctx: AudioContext,
  masterBus: AudioNode,
  presetIndex = 0,
): Voice {
  const preset = FORMANT_PRESETS[presetIndex % FORMANT_PRESETS.length]!;

  const oscA = ctx.createOscillator();
  oscA.type = "sawtooth";
  oscA.start();

  const oscB = ctx.createOscillator();
  oscB.type = "triangle";
  oscB.detune.value = DETUNE_CENTS_B;
  oscB.start();

  const vibratoLFO = ctx.createOscillator();
  vibratoLFO.type = "sine";
  vibratoLFO.frequency.value = VIBRATO_RATE;
  vibratoLFO.start();

  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = VIBRATO_DEPTH_CENTS;
  vibratoLFO.connect(vibratoGain);
  vibratoGain.connect(oscA.detune);
  vibratoGain.connect(oscB.detune);

  const formantF1 = ctx.createBiquadFilter();
  formantF1.type = "bandpass";
  formantF1.frequency.value = preset.f1;
  formantF1.Q.value = 5;

  const formantF2 = ctx.createBiquadFilter();
  formantF2.type = "bandpass";
  formantF2.frequency.value = preset.f2;
  formantF2.Q.value = 5;

  const formantMix = ctx.createGain();
  formantMix.gain.value = 0.5;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2000;
  lowpass.Q.value = 1;

  const tremoloLFO = ctx.createOscillator();
  tremoloLFO.type = "sine";
  tremoloLFO.frequency.value = 0;
  tremoloLFO.start();

  const tremoloDepth = ctx.createGain();
  tremoloDepth.gain.value = 0;
  tremoloLFO.connect(tremoloDepth);

  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 1;
  tremoloDepth.connect(tremoloGain.gain);

  const envelope = ctx.createGain();
  envelope.gain.value = 0;

  const panner = ctx.createStereoPanner();

  oscA.connect(formantF1);
  oscA.connect(formantF2);
  oscB.connect(formantF1);
  oscB.connect(formantF2);

  formantF1.connect(formantMix);
  formantF2.connect(formantMix);

  formantMix.connect(lowpass);
  lowpass.connect(tremoloGain);
  tremoloGain.connect(envelope);
  envelope.connect(panner);
  panner.connect(masterBus);

  return {
    setFrequency(hz: number) {
      oscA.frequency.setTargetAtTime(hz, ctx.currentTime, SMOOTH_TC);
      oscB.frequency.setTargetAtTime(hz, ctx.currentTime, SMOOTH_TC);
    },

    setCutoff(hz: number) {
      lowpass.frequency.setTargetAtTime(hz, ctx.currentTime, SMOOTH_TC);
    },

    setTremolo(depth: number, rate: number) {
      tremoloDepth.gain.setTargetAtTime(depth, ctx.currentTime, SMOOTH_TC);
      tremoloLFO.frequency.setTargetAtTime(rate, ctx.currentTime, SMOOTH_TC);
    },

    gateOn() {
      envelope.gain.setTargetAtTime(1, ctx.currentTime, ATTACK_S);
    },

    gateOff() {
      envelope.gain.setTargetAtTime(0, ctx.currentTime, RELEASE_S);
    },

    setPan(value: number) {
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), ctx.currentTime, SMOOTH_TC);
    },

    destroy() {
      oscA.stop();
      oscB.stop();
      vibratoLFO.stop();
      tremoloLFO.stop();
      oscA.disconnect();
      oscB.disconnect();
      vibratoLFO.disconnect();
      tremoloLFO.disconnect();
      formantF1.disconnect();
      formantF2.disconnect();
      formantMix.disconnect();
      lowpass.disconnect();
      tremoloGain.disconnect();
      envelope.disconnect();
      panner.disconnect();
    },
  };
}
