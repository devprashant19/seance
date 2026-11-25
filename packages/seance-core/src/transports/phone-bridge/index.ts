export {
  PROTOCOL_VERSION,
  encodeBatch,
  decodeBatch,
  isClientMessage,
  isServerMessage,
  validateProtocolMessage,
  validateInstruct,
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

export { HostTransport } from "./host.js";
export type { PeerInfo, HostTransportEvents } from "./host.js";

export { PhoneSpirit } from "./phone-spirit.js";
export type { PhoneSpiritConfig } from "./phone-spirit.js";

export { PhoneClient } from "./phone-client.js";
export type { PhoneClientConfig, PhoneClientEvents, PhoneClientState } from "./phone-client.js";

export {
  DEG_TO_RAD,
  motionSample,
  orientationSample,
  buildPhoneChannels,
  toTimeSamples,
} from "./phone-samples.js";
export type { MotionSample, OrientationSample, TouchSample, ChannelArrays } from "./phone-samples.js";

export { openHost, saveHostSession, loadHostSession, clearHostSession } from "./host-session.js";
export type { HostSession, HostEvents, DecodedBatch } from "./host-session.js";

export { FakeRelay } from "./fake-relay.js";
export type { FakeClient } from "./fake-relay.js";
