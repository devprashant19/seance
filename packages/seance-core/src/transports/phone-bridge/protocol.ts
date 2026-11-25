export const PROTOCOL_VERSION = 1;

export type Role = "host" | "peer" | "observer";

export type ChannelKind = "accel" | "accelG" | "gyro" | "orientation";

export interface BatchPayload {
  readonly seq: number;
  readonly channels: Record<
    string,
    { readonly t: number[]; readonly data: number[][] }
  >;
}

export type ClientMessage =
  | { type: "hello"; version: number; role: Role; roomCode?: string; resumeToken?: string }
  | { type: "ready"; capabilities: readonly string[] }
  | { type: "batch"; payload: BatchPayload }
  | { type: "sync-reply"; t0: number; t1: number; t2: number; t3: number }
  | { type: "peer-hidden" }
  | { type: "peer-visible" }
  | { type: "instruct"; to: string; text: string; step?: number };

export type ServerMessage =
  | { type: "welcome"; roomCode: string; peerId: string; resumeToken: string }
  | { type: "peer-joined"; peerId: string; capabilities: readonly string[] }
  | { type: "peer-left"; peerId: string; reason: string }
  | { type: "batch"; peerId: string; payload: BatchPayload }
  | { type: "sync"; t0: number }
  | { type: "sync-reply"; peerId: string; t0: number; t1: number; t2: number; t3: number }
  | { type: "room-paused"; reason: string }
  | { type: "room-resumed" }
  | { type: "instruct"; from: string; to: string; text: string; step?: number }
  | { type: "error"; code: string; message: string };

export type ProtocolMessage = ClientMessage | ServerMessage;

export function isClientMessage(msg: unknown): msg is ClientMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (typeof m.type !== "string") return false;
  return [
    "hello",
    "ready",
    "batch",
    "sync-reply",
    "peer-hidden",
    "peer-visible",
    "instruct",
  ].includes(m.type);
}

export function isServerMessage(msg: unknown): msg is ServerMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (typeof m.type !== "string") return false;
  return [
    "welcome",
    "peer-joined",
    "peer-left",
    "batch",
    "sync",
    "sync-reply",
    "room-paused",
    "room-resumed",
    "instruct",
    "error",
  ].includes(m.type);
}

export function validateInstruct(
  msg: unknown,
): { valid: boolean; reason?: string } {
  if (typeof msg !== "object" || msg === null) {
    return { valid: false, reason: "Message must be an object" };
  }
  const m = msg as Record<string, unknown>;
  if (m.type !== "instruct") {
    return { valid: false, reason: "Type must be instruct" };
  }
  if (typeof m.to !== "string" || m.to.trim().length === 0) {
    return { valid: false, reason: "Target peer 'to' must be specified" };
  }
  if (typeof m.text !== "string") {
    return { valid: false, reason: "Instruction text must be a string" };
  }
  if (m.text.length > 200) {
    return {
      valid: false,
      reason: `Instruction text exceeds 200 character limit (${m.text.length} chars)`,
    };
  }
  return { valid: true };
}

export function encodeBatch(
  seq: number,
  channels: Record<string, { t: Float64Array; values: Float32Array[] }>,
): BatchPayload {
  const encoded: BatchPayload["channels"] = {};
  for (const [id, ch] of Object.entries(channels)) {
    encoded[id] = {
      t: Array.from(ch.t),
      data: ch.values.map((v) => Array.from(v)),
    };
  }
  return { seq, channels: encoded };
}

export function decodeBatch(
  payload: BatchPayload,
): {
  seq: number;
  channels: Record<string, { t: Float64Array; values: Float32Array[] }>;
} {
  const decoded: Record<
    string,
    { t: Float64Array; values: Float32Array[] }
  > = {};
  for (const [id, ch] of Object.entries(payload.channels)) {
    decoded[id] = {
      t: Float64Array.from(ch.t),
      values: ch.data.map((d) => Float32Array.from(d)),
    };
  }
  return { seq: payload.seq, channels: decoded };
}

export function validateProtocolMessage(msg: unknown): msg is ProtocolMessage {
  return isClientMessage(msg) || isServerMessage(msg);
}
