export type {
  SonifyRange,
  MapOptions,
  ToneParams,
} from "./mapping.js";

export { mapToTone } from "./mapping.js";

export type {
  EarconKind,
  EarconEvent,
  EarconOptions,
  EarconAudioParams,
} from "./earcons.js";

export {
  earconsForTrace,
  getEarconAudioParams,
} from "./earcons.js";

export type {
  ResultSentenceParams,
} from "./speech.js";

export {
  expandUnitSpoken,
  formatWithUncertainty,
  resultSentence,
  speakSentence,
} from "./speech.js";

export type {
  LimiterParams,
} from "./limiter.js";

export {
  DEFAULT_LIMITER_PARAMS,
  computeLimitedGain,
  createLimiterNode,
} from "./limiter.js";

export type {
  ScrubState,
} from "./scrub.js";

export { scrubIndex } from "./scrub.js";

export type { SonifyEngine } from "./engine.js";
export { createSonifyEngine } from "./engine.js";
