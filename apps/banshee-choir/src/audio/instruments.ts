/**
 * Synthesised instruments for the Banshee Choir (pure Web Audio, no samples).
 *
 * Every instrument implements the same `Voice` interface as the original banshee voice, so the
 * phone controls stay identical: tilt = pitch, roll = brightness, shake = tremolo, hold = sing.
 * Percussive instruments (music box, bells) strike when the gate opens and re-strike on every new
 * note while held, so tilting plays a melody.
 */
import type { InstrumentId } from "seance-core/transports/phone-bridge";
import { createVoice, type Voice } from "./voice.js";

export interface InstrumentVoice extends Voice {
  readonly instrument: InstrumentId;
}

interface Source {
  /** Feed this into the shared filter → tremolo → envelope chain. */
  readonly out: AudioNode;
  setFrequency(hz: number, glide: number): void;
  stop(): void;
}

interface Recipe {
  /** Seconds. */
  attack: number;
  release: number;
  /** Percussive: decays to silence on its own (seconds), re-strikes on new notes. */
  strikeDecay?: number;
  /** Pitch glide time constant (seconds). */
  glide: number;
  /** Output level trim. */
  level: number;
  /** Brightness range for the roll → cutoff control. */
  cutoffScale: number;
  /** Multiplies the played frequency (e.g. 0.5 = an octave down). */
  transpose: number;
  build(ctx: AudioContext): Source;
}

function osc(ctx: AudioContext, type: OscillatorType, detuneCents = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.detune.value = detuneCents;
  o.start();
  return o;
}

function vibrato(ctx: AudioContext, rateHz: number, depthCents: number, targets: OscillatorNode[]): () => void {
  const lfo = osc(ctx, "sine");
  lfo.frequency.value = rateHz;
  const depth = ctx.createGain();
  depth.gain.value = depthCents;
  lfo.connect(depth);
  for (const t of targets) depth.connect(t.detune);
  return () => {
    lfo.stop();
    lfo.disconnect();
    depth.disconnect();
  };
}

/** Additive / multi-oscillator source: each partial = (frequency ratio, wave, gain, detune). */
function partials(
  ctx: AudioContext,
  parts: readonly { ratio: number; type: OscillatorType; gain: number; detune?: number }[],
  vib?: { rate: number; depth: number },
): Source {
  const mix = ctx.createGain();
  const oscs = parts.map((p) => {
    const o = osc(ctx, p.type, p.detune ?? 0);
    const g = ctx.createGain();
    g.gain.value = p.gain;
    o.connect(g);
    g.connect(mix);
    return { o, g, ratio: p.ratio };
  });
  const stopVib = vib ? vibrato(ctx, vib.rate, vib.depth, oscs.map((x) => x.o)) : () => {};
  return {
    out: mix,
    setFrequency(hz, glide) {
      for (const x of oscs) x.o.frequency.setTargetAtTime(hz * x.ratio, ctx.currentTime, glide);
    },
    stop() {
      stopVib();
      for (const x of oscs) {
        x.o.stop();
        x.o.disconnect();
        x.g.disconnect();
      }
      mix.disconnect();
    },
  };
}

const RECIPES: Record<Exclude<InstrumentId, "banshee">, Recipe> = {
  organ: {
    attack: 0.03, release: 0.25, glide: 0.01, level: 0.32, cutoffScale: 1.6, transpose: 0.5,
    build: (ctx) =>
      partials(
        ctx,
        [
          { ratio: 1, type: "sine", gain: 0.55 },
          { ratio: 2, type: "sine", gain: 0.45 },
          { ratio: 3, type: "sine", gain: 0.25 },
          { ratio: 4, type: "sine", gain: 0.22 },
          { ratio: 6, type: "sine", gain: 0.1 },
          { ratio: 8, type: "sine", gain: 0.12 },
          { ratio: 0.5, type: "sine", gain: 0.35 },
        ],
        { rate: 6.2, depth: 6 },
      ),
  },
  theremin: {
    attack: 0.12, release: 0.35, glide: 0.09, level: 0.5, cutoffScale: 1.2, transpose: 1,
    build: (ctx) =>
      partials(ctx, [
        { ratio: 1, type: "sine", gain: 0.9 },
        { ratio: 2, type: "sine", gain: 0.08 },
      ], { rate: 6.5, depth: 28 }),
  },
  strings: {
    attack: 0.35, release: 0.6, glide: 0.04, level: 0.2, cutoffScale: 0.9, transpose: 1,
    build: (ctx) =>
      partials(ctx, [
        { ratio: 1, type: "sawtooth", gain: 0.4, detune: -9 },
        { ratio: 1, type: "sawtooth", gain: 0.4, detune: 0 },
        { ratio: 1, type: "sawtooth", gain: 0.4, detune: 11 },
        { ratio: 0.5, type: "sawtooth", gain: 0.25, detune: 4 },
      ], { rate: 5.2, depth: 9 }),
  },
  musicbox: {
    attack: 0.004, release: 0.4, strikeDecay: 0.55, glide: 0.001, level: 0.45, cutoffScale: 2.2, transpose: 2,
    build: (ctx) =>
      partials(ctx, [
        { ratio: 1, type: "triangle", gain: 0.7 },
        { ratio: 2, type: "sine", gain: 0.3 },
        { ratio: 4.01, type: "sine", gain: 0.12 },
      ]),
  },
  bells: {
    attack: 0.003, release: 1.2, strikeDecay: 1.4, glide: 0.001, level: 0.32, cutoffScale: 2.4, transpose: 1,
    build: (ctx) => {
      // Two-operator FM with an inharmonic ratio gives the metallic "clang".
      const carrier = osc(ctx, "sine");
      const modulator = osc(ctx, "sine");
      const modDepth = ctx.createGain();
      modulator.connect(modDepth);
      modDepth.connect(carrier.frequency);
      const shimmer = osc(ctx, "sine");
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.18;
      shimmer.connect(shimmerGain);
      const mix = ctx.createGain();
      carrier.connect(mix);
      shimmerGain.connect(mix);
      return {
        out: mix,
        setFrequency(hz, glide) {
          const now = ctx.currentTime;
          carrier.frequency.setTargetAtTime(hz, now, glide);
          modulator.frequency.setTargetAtTime(hz * 3.5, now, glide);
          modDepth.gain.setTargetAtTime(hz * 1.8, now, glide);
          shimmer.frequency.setTargetAtTime(hz * 5.4, now, glide);
        },
        stop() {
          for (const o of [carrier, modulator, shimmer]) {
            o.stop();
            o.disconnect();
          }
          modDepth.disconnect();
          shimmerGain.disconnect();
          mix.disconnect();
        },
      };
    },
  },
  choir: {
    attack: 0.45, release: 0.8, glide: 0.05, level: 0.42, cutoffScale: 1, transpose: 1,
    build: (ctx) => {
      // Detuned saws through "aah" formants (F1 ≈ 730 Hz, F2 ≈ 1090 Hz), plus breathy noise.
      const src = partials(ctx, [
        { ratio: 1, type: "sawtooth", gain: 0.35, detune: -12 },
        { ratio: 1, type: "sawtooth", gain: 0.35, detune: 10 },
        { ratio: 2, type: "sawtooth", gain: 0.15, detune: 3 },
      ], { rate: 4.8, depth: 14 });
      const f1 = ctx.createBiquadFilter();
      f1.type = "bandpass";
      f1.frequency.value = 730;
      f1.Q.value = 6;
      const f2 = ctx.createBiquadFilter();
      f2.type = "bandpass";
      f2.frequency.value = 1090;
      f2.Q.value = 7;
      const mix = ctx.createGain();
      mix.gain.value = 1.4;
      src.out.connect(f1);
      src.out.connect(f2);
      f1.connect(mix);
      f2.connect(mix);
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const breath = ctx.createBiquadFilter();
      breath.type = "bandpass";
      breath.frequency.value = 2500;
      breath.Q.value = 1;
      const breathGain = ctx.createGain();
      breathGain.gain.value = 0.05;
      noise.connect(breath);
      breath.connect(breathGain);
      breathGain.connect(mix);
      noise.start();
      return {
        out: mix,
        setFrequency: (hz, glide) => src.setFrequency(hz, glide),
        stop() {
          src.stop();
          noise.stop();
          for (const n of [noise, breath, breathGain, f1, f2, mix]) n.disconnect();
        },
      };
    },
  },
  bass: {
    attack: 0.01, release: 0.18, glide: 0.02, level: 0.42, cutoffScale: 0.45, transpose: 0.25,
    build: (ctx) =>
      partials(ctx, [
        { ratio: 1, type: "square", gain: 0.45 },
        { ratio: 1, type: "sawtooth", gain: 0.3, detune: 7 },
        { ratio: 0.5, type: "sine", gain: 0.7 },
      ]),
  },
};

const SMOOTH_TC = 0.016;

/** Build a playable voice for `instrument`, routed into `masterBus`. */
export function createInstrumentVoice(
  ctx: AudioContext,
  masterBus: AudioNode,
  instrument: InstrumentId,
  index = 0,
): InstrumentVoice {
  if (instrument === "banshee") {
    return Object.assign(createVoice(ctx, masterBus, index), { instrument }) as InstrumentVoice;
  }
  const recipe = RECIPES[instrument];
  const source = recipe.build(ctx);

  const level = ctx.createGain();
  level.gain.value = recipe.level;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2400 * recipe.cutoffScale;
  lowpass.Q.value = 0.8;
  const tremoloLFO = osc(ctx, "sine");
  tremoloLFO.frequency.value = 0;
  const tremoloDepth = ctx.createGain();
  tremoloDepth.gain.value = 0;
  tremoloLFO.connect(tremoloDepth);
  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 1;
  tremoloDepth.connect(tremoloGain.gain);
  const envelope = ctx.createGain();
  envelope.gain.value = 0;
  const panner = ctx.createStereoPanner();

  source.out.connect(level);
  level.connect(lowpass);
  lowpass.connect(tremoloGain);
  tremoloGain.connect(envelope);
  envelope.connect(panner);
  panner.connect(masterBus);

  let gated = false;
  let lastHz = 0;

  const strike = () => {
    const now = ctx.currentTime;
    envelope.gain.cancelScheduledValues(now);
    envelope.gain.setValueAtTime(Math.max(0.0001, envelope.gain.value * 0.3), now);
    envelope.gain.linearRampToValueAtTime(1, now + recipe.attack);
    envelope.gain.setTargetAtTime(0, now + recipe.attack, recipe.strikeDecay! / 3);
  };

  return {
    instrument,
    setFrequency(hz: number) {
      const f = hz * recipe.transpose;
      const newNote = lastHz > 0 && Math.abs(f / lastHz - 1) > 0.02;
      lastHz = f;
      source.setFrequency(f, recipe.glide);
      if (recipe.strikeDecay && gated && newNote) strike();
    },
    setCutoff(hz: number) {
      lowpass.frequency.setTargetAtTime(Math.min(16000, hz * recipe.cutoffScale), ctx.currentTime, SMOOTH_TC);
    },
    setTremolo(depth: number, rate: number) {
      tremoloDepth.gain.setTargetAtTime(depth, ctx.currentTime, SMOOTH_TC);
      tremoloLFO.frequency.setTargetAtTime(rate, ctx.currentTime, SMOOTH_TC);
    },
    gateOn() {
      if (gated) return; // called every frame while held: only act on the edge
      gated = true;
      if (recipe.strikeDecay) strike();
      else {
        envelope.gain.cancelScheduledValues(ctx.currentTime);
        envelope.gain.setTargetAtTime(1, ctx.currentTime, recipe.attack / 3);
      }
    },
    gateOff() {
      if (!gated) return;
      gated = false;
      envelope.gain.cancelScheduledValues(ctx.currentTime);
      envelope.gain.setTargetAtTime(0, ctx.currentTime, recipe.release / 3);
    },
    setPan(value: number) {
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), ctx.currentTime, SMOOTH_TC);
    },
    destroy() {
      source.stop();
      tremoloLFO.stop();
      for (const n of [tremoloLFO, tremoloDepth, tremoloGain, level, lowpass, envelope, panner]) n.disconnect();
    },
  };
}
