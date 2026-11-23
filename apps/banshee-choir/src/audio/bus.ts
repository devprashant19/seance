export interface MasterBus {
  inputNode: AudioNode;
  setVolume(value: number): void;
  destroy(): void;
}

const LIMITER_THRESHOLD = -3;
const LIMITER_RATIO = 20;
const LIMITER_ATTACK = 0.003;
const LIMITER_RELEASE = 0.25;
const SMOOTH_TC = 0.016;

export function createMasterBus(ctx: AudioContext): MasterBus {
  const sumGain = ctx.createGain();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = LIMITER_THRESHOLD;
  compressor.ratio.value = LIMITER_RATIO;
  compressor.attack.value = LIMITER_ATTACK;
  compressor.release.value = LIMITER_RELEASE;
  compressor.knee.value = 0;

  const masterVolume = ctx.createGain();
  masterVolume.gain.value = 0.8;

  sumGain.connect(compressor);
  compressor.connect(masterVolume);
  masterVolume.connect(ctx.destination);

  return {
    inputNode: sumGain,

    setVolume(value: number) {
      masterVolume.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        ctx.currentTime,
        SMOOTH_TC,
      );
    },

    destroy() {
      sumGain.disconnect();
      compressor.disconnect();
      masterVolume.disconnect();
    },
  };
}
