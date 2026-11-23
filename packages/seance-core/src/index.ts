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
