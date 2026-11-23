import { BaseSpirit } from "../../base-spirit.js";
import type { ChannelId } from "../../channels.js";
import type { ChannelInfo, SampleBatch, TransportKind } from "../../spirit.js";
import type { ServerMessage } from "./protocol.js";
import { decodeBatch, encodeBatch } from "./protocol.js";

export interface PhoneSpiritConfig {
  readonly peerId: string;
  readonly roomCode: string;
  readonly sendMessage: (msg: unknown) => void;
  readonly channels?: readonly ChannelInfo[];
}

const DEFAULT_CHANNELS: readonly ChannelInfo[] = [
  { id: "accel", unit: "m/s^2", axes: ["x", "y", "z"], nominalRateHz: 60 },
  { id: "gyro", unit: "rad/s", axes: ["x", "y", "z"], nominalRateHz: 60 },
  { id: "orientation", unit: "deg", axes: ["alpha", "beta", "gamma"], nominalRateHz: 60 },
];

export class PhoneSpirit extends BaseSpirit {
  readonly id: string;
  readonly kind = "poltergeist" as const;
  readonly label: string;
  private readonly _sendMessage: (msg: unknown) => void;
  private readonly _supportedChannels: readonly ChannelInfo[];
  private _seq = 0;

  constructor(config: PhoneSpiritConfig) {
    super();
    this.id = `phone-${config.peerId}`;
    this.label = `Phone ${config.peerId}`;
    this._sendMessage = config.sendMessage;
    this._supportedChannels = config.channels ?? DEFAULT_CHANNELS;
  }

  override get transport(): TransportKind {
    return "phone-bridge";
  }

  override get capabilities(): readonly ChannelInfo[] {
    return this._supportedChannels;
  }

  override async summon(): Promise<void> {
    this.setState("summoning");
    this._sendMessage({ type: "ready", capabilities: this._supportedChannels.map((c) => c.id) });
    this.setState("present");
  }

  override async banish(): Promise<void> {
    this.setState("fading");
    this.setState("banished");
  }

  sendBatch(
    channels: Record<string, { t: Float64Array; values: Float32Array[] }>,
  ): void {
    this._seq++;
    const payload = encodeBatch(this._seq, channels);
    this._sendMessage({ type: "batch", payload });

    for (const [chId, ch] of Object.entries(channels)) {
      const batch: SampleBatch = {
        channel: chId as ChannelId,
        seq: this._seq,
        t: ch.t,
        values: ch.values,
      };
      this.emitBatch(batch);
    }
  }

  handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "batch": {
        const decoded = decodeBatch(msg.payload);
        for (const [chId, ch] of Object.entries(decoded.channels)) {
          const batch: SampleBatch = {
            channel: chId as ChannelId,
            seq: decoded.seq,
            t: ch.t,
            values: ch.values,
          };
          this.emitBatch(batch);
        }
        break;
      }
      case "room-paused":
        this.setState("fading");
        break;
      case "error":
        this.setState("error");
        break;
      default:
        break;
    }
  }
}
