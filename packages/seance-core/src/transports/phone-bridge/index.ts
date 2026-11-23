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
