export interface LimiterParams {
  readonly thresholdDb: number;
  readonly knee: number;
  readonly ratio: number;
  readonly attackSec: number;
  readonly releaseSec: number;
  readonly maxMasterGain: number;
}

export const DEFAULT_LIMITER_PARAMS: LimiterParams = {
  thresholdDb: -12,
  knee: 10,
  ratio: 20,
  attackSec: 0.003,
  releaseSec: 0.05,
  maxMasterGain: 0.5, // -6 dBFS max output
};

export function computeLimitedGain(
  inputPeakLinear: number,
  params: LimiterParams = DEFAULT_LIMITER_PARAMS,
): number {
  if (!Number.isFinite(inputPeakLinear) || inputPeakLinear <= 0) {
    return 0;
  }

  const inputDb = 20 * Math.log10(inputPeakLinear);

  let compressedDb = inputDb;
  if (inputDb > params.thresholdDb) {
    const overDb = inputDb - params.thresholdDb;
    compressedDb = params.thresholdDb + overDb / params.ratio;
  }

  const gainReductionLinear = Math.pow(10, (compressedDb - inputDb) / 20);
  const rawOutput = inputPeakLinear * gainReductionLinear * params.maxMasterGain;

  // Strict clamp safety invariant
  return Math.min(params.maxMasterGain, Math.max(0, rawOutput));
}

export function createLimiterNode(
  ctx: BaseAudioContext,
  params: LimiterParams = DEFAULT_LIMITER_PARAMS,
): { input: AudioNode; output: AudioNode } {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(params.thresholdDb, ctx.currentTime);
  compressor.knee.setValueAtTime(params.knee, ctx.currentTime);
  compressor.ratio.setValueAtTime(params.ratio, ctx.currentTime);
  compressor.attack.setValueAtTime(params.attackSec, ctx.currentTime);
  compressor.release.setValueAtTime(params.releaseSec, ctx.currentTime);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(params.maxMasterGain, ctx.currentTime);

  compressor.connect(masterGain);

  return {
    input: compressor,
    output: masterGain,
  };
}
