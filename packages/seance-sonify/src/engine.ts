import type { Mood } from "seance-core";
import { mapToTone, type SonifyRange } from "./mapping.js";
import { getEarconAudioParams, type EarconKind } from "./earcons.js";
import { createLimiterNode } from "./limiter.js";
import { speakSentence } from "./speech.js";

export interface SonifyEngine {
  readonly ctx: AudioContext;
  start(): void;
  stop(): void;
  feed(x: number, range: SonifyRange, sigma?: number, mood?: Mood): void;
  playEarcon(kind: EarconKind): void;
  speak(text: string, urgent?: boolean): Promise<void>;
  dispose(): void;
}

export function createSonifyEngine(
  ctx: AudioContext,
  opts?: { masterVolume?: number },
): SonifyEngine {
  const masterVolume = opts?.masterVolume ?? 0.8;

  // Master limiting chain
  const limiter = createLimiterNode(ctx);
  const userVolNode = ctx.createGain();
  userVolNode.gain.setValueAtTime(masterVolume, ctx.currentTime);

  limiter.output.connect(userVolNode);
  userVolNode.connect(ctx.destination);

  // Core oscillator & panning chain
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);

  // Tremolo (amplitude modulation via LFO)
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(6, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, ctx.currentTime);
  lfo.connect(lfoGain.gain);

  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0, ctx.currentTime);

  // Stereo panner
  let panner: StereoPannerNode | null = null;
  if ("createStereoPanner" in ctx) {
    panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(0, ctx.currentTime);
  }

  // Connect chain: osc -> toneGain -> (panner) -> limiter.input
  osc.connect(toneGain);
  if (panner) {
    toneGain.connect(panner);
    panner.connect(limiter.input);
  } else {
    toneGain.connect(limiter.input);
  }

  let running = false;

  function start() {
    if (running) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    try {
      osc.start();
      lfo.start();
    } catch {
      /* already started */
    }
    running = true;
  }

  function stop() {
    if (!running) return;
    toneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  function feed(x: number, range: SonifyRange, sigma?: number, mood?: Mood) {
    if (!running) return;
    const tone = mapToTone(x, range, sigma, { mood });

    const now = ctx.currentTime;
    osc.frequency.setTargetAtTime(tone.freqHz, now, 0.02);
    osc.detune.setTargetAtTime(tone.detuneCents, now, 0.02);
    toneGain.gain.setTargetAtTime(tone.gain, now, 0.03);

    if (panner) {
      panner.pan.setTargetAtTime(tone.pan, now, 0.04);
    }
    lfoGain.gain.setTargetAtTime(tone.tremoloDepth, now, 0.05);
  }

  function playEarcon(kind: EarconKind) {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const params = getEarconAudioParams(kind);
    const now = ctx.currentTime;

    if (params.oscillatorType === "noise") {
      // 8-12ms noise click for zero crossings
      const bufferSize = Math.floor(ctx.sampleRate * (params.durationMs / 1000));
      const buffer = ctx.createBuffer(1, Math.max(1, bufferSize), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(params.gain, now);

      noiseSource.connect(noiseGain);
      noiseGain.connect(limiter.input);
      noiseSource.start(now);
      return;
    }

    // Tones / Chimes / Triads
    params.frequencies.forEach((freq, idx) => {
      const eOsc = ctx.createOscillator();
      const eGain = ctx.createGain();

      eOsc.type = params.oscillatorType as OscillatorType;
      eOsc.frequency.setValueAtTime(freq, now + idx * 0.06);

      eGain.gain.setValueAtTime(params.gain, now + idx * 0.06);
      eGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + idx * 0.06 + params.durationMs / 1000,
      );

      eOsc.connect(eGain);
      eGain.connect(limiter.input);

      eOsc.start(now + idx * 0.06);
      eOsc.stop(now + idx * 0.06 + params.durationMs / 1000 + 0.05);
    });
  }

  async function speak(text: string, urgent = false) {
    return speakSentence(text, { urgent });
  }

  function dispose() {
    running = false;
    try {
      osc.stop();
      lfo.stop();
      osc.disconnect();
      toneGain.disconnect();
      limiter.input.disconnect();
    } catch {
      /* ignore */
    }
  }

  return {
    ctx,
    start,
    stop,
    feed,
    playEarcon,
    speak,
    dispose,
  };
}
