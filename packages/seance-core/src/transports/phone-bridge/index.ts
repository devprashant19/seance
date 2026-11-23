export {
  PROTOCOL_VERSION,
  encodeBatch,
  decodeBatch,
  isClientMessage,
  isServerMessage,
  validateProtocolMessage,
} from "./protocol.js";

export type {
  Role,
  ChannelKind,
  BatchPayload,
  ClientMessage,
  ServerMessage,
  ProtocolMessage,
} from "./protocol.js";

export { ClockSync } from "./clock-sync.js";
export type { SyncSample, ClockEstimate } from "./clock-sync.js";

export { ReconnectManager } from "./reconnect.js";
export type { ReconnectConfig, ReconnectState, ReconnectEvents } from "./reconnect.js";
