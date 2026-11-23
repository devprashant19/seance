import type { ChannelId } from "./channels.js";
import type { Unit } from "./units.js";

export type SpiritKind =
  | "poltergeist"
  | "banshee"
  | "watcher"
  | "golem"
  | "wisp"
  | "organist"
  | "revenant";

export type SpiritState =
  | "idle"
  | "summoning"
  | "present"
  | "fading"
  | "banished"
  | "error";

export type Mood = "calm" | "uneasy" | "restless" | "fading";

export type TransportKind =
  | "phone-bridge"
  | "local"
  | "serial"
  | "bluetooth"
  | "midi"
  | "mock"
  | "replay";

export interface ChannelInfo {
  readonly id: ChannelId;
  readonly unit: Unit;
  readonly axes: readonly string[];
  readonly nominalRateHz: number;
}

export interface SampleBatch {
  readonly channel: ChannelId;
  readonly seq: number;
  readonly t: Float64Array;
  readonly values: readonly Float32Array[];
}

export interface HealthReport {
  readonly rateHz: number;
  readonly jitterPct: number;
  readonly dropouts: number;
  readonly noiseFloor?: number;
  readonly clockOffsetMs?: number;
  readonly rttMs?: number;
  readonly calibrated: boolean;
  readonly mood: Mood;
  readonly reason: string;
}

export type SpiritEvent = "state" | "health" | "error" | "end";

export interface Spirit {
  readonly id: string;
  readonly kind: SpiritKind;
  readonly label: string;
  readonly transport: TransportKind;
  readonly capabilities: readonly ChannelInfo[];
  readonly state: SpiritState;
  summon(): Promise<void>;
  banish(): Promise<void>;
  stream(channel: ChannelId): SpiritStream;
  health(): HealthReport;
  on(event: SpiritEvent, cb: (payload: unknown) => void): () => void;
}

export interface SpiritStream {
  subscribe(cb: (batch: SampleBatch) => void): () => void;
  latest(): SampleBatch | undefined;
}

export class UnsupportedChannelError extends Error {
  constructor(channel: string) {
    super(`Unsupported channel: ${channel}`);
    this.name = "UnsupportedChannelError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = "Permission denied") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class TransportUnavailableError extends Error {
  constructor(message = "Transport unavailable") {
    super(message);
    this.name = "TransportUnavailableError";
  }
}

export class SpiritLostError extends Error {
  constructor(message = "Spirit lost") {
    super(message);
    this.name = "SpiritLostError";
  }
}
