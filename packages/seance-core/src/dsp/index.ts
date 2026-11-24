export { computeTimingStats } from "./timing.js";
export type { TimingStats } from "./timing.js";

export { linearResample } from "./resample.js";

export { designBiquad, applyBiquad } from "./filters.js";
export type { BiquadType, BiquadCoeffs } from "./filters.js";

export { realFft, realFftWithRate } from "./fft.js";

export { detectZeroCrossings, detectFreeFall } from "./events.js";
export type { ZeroCrossing, FreeFallWindow } from "./events.js";

export { estimateDamping } from "./damping.js";
export type { DampingEstimate } from "./damping.js";

export { linearFit } from "./fit.js";
export type { LinearFit } from "./fit.js";

export { meanWithUncertainty, propagateAdd, propagateMultiply } from "./uncertainty.js";
export type { UncertainValue } from "./uncertainty.js";

export {
  median,
  mad,
  detectGaps,
  detectClipping,
  auditTraceArtifacts,
} from "./robust.js";
export type {
  GapArtifact,
  ClippingArtifact,
  ChannelAudit,
  TraceAuditReport,
} from "./robust.js";

