export type {
  Unit,
  Quantity,
} from "./units.js";

export {
  q,
  add,
  sub,
  scale,
  negate,
  abs,
  rawValue,
  convert,
  isConvertible,
} from "./units.js";

export type {
  ChannelId,
  ChannelDef,
} from "./channels.js";

export {
  CHANNELS,
  isKnownChannel,
} from "./channels.js";

export type {
  SpiritKind,
  SpiritState,
  Mood,
  TransportKind,
  ChannelInfo,
  SampleBatch,
  HealthReport,
  SpiritEvent,
  Spirit,
  SpiritStream,
} from "./spirit.js";

export {
  UnsupportedChannelError,
  PermissionDeniedError,
  TransportUnavailableError,
  SpiritLostError,
} from "./spirit.js";

export { BaseSpirit } from "./base-spirit.js";

export type {
  TraceChannel,
  TraceDevice,
  GhostTrace,
} from "./trace.js";

export {
  createTraceId,
  validateTrace,
  decodeTrace,
  encodeTrace,
} from "./trace.js";

export { TraceRecorder } from "./trace-recorder.js";

export type {
  HealthThresholds,
  HealthSnapshot,
} from "./health.js";

export {
  DEFAULT_THRESHOLDS,
  MoodMachine,
  HealthMonitor,
} from "./health.js";

export * from "./dsp/index.js";

export type {
  InstrumentDef,
  ExperimentDef,
} from "./plugin.js";

export {
  defineInstrument,
  defineExperiment,
  PluginRegistry,
  getGlobalRegistry,
} from "./plugin.js";

export { createLocalSpirit } from "./transports/local.js";
