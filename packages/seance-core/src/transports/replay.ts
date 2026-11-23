import { BaseSpirit } from "../base-spirit.js";
import type { ChannelId } from "../channels.js";
import type {
  ChannelInfo,
  HealthReport,
  SpiritKind,
  TransportKind,
} from "../spirit.js";
import type { GhostTrace } from "../trace.js";

export interface ReplayConfig {
  readonly speed?: number;
  readonly clock?: "real" | "manual";
}

export class ReplaySpirit extends BaseSpirit {
  readonly id: string;
  readonly kind: SpiritKind;
  readonly label: string;
  readonly transport: TransportKind = "replay";
  readonly capabilities: readonly ChannelInfo[];

  private readonly _trace: GhostTrace;
  private readonly _speed: number;
  private readonly _clockMode: "real" | "manual";
  private _cursor = 0;
  private _timer: ReturnType<typeof setInterval> | undefined;
  private _seq = 0;
  private _batchSize = 5;

  constructor(trace: GhostTrace, config?: ReplayConfig) {
    super();
    this._trace = trace;
    this._speed = config?.speed ?? 1;
    this._clockMode = config?.clock ?? "real";
    this.id = `replay-${trace.id}`;
    this.kind = (trace.spiritKind as SpiritKind) ?? "revenant";
    this.label = `Replay of ${trace.spiritId}`;
    this.capabilities = trace.channels.map((ch) => ({
      id: ch.id,
      unit: ch.unit,
      axes: [...ch.axes],
      nominalRateHz: ch.t.length > 1
        ? 1000 / ((ch.t[ch.t.length - 1]! - ch.t[0]!) / (ch.t.length - 1))
        : 60,
    }));
  }

  async summon(): Promise<void> {
    this.setState("summoning", "loading trace");
    this._cursor = 0;
    this._seq = 0;
    this.setState("present", "replay started");

    if (this._clockMode !== "manual") {
      const intervalMs = Math.max(10, (this._batchSize * 16) / this._speed);
      this._timer = setInterval(() => {
        this._emitNext();
      }, intervalMs);
    }
  }

  override async banish(): Promise<void> {
    if (this._timer !== undefined) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
    await super.banish();
  }

  advance(samples: number): void {
    if (this._clockMode !== "manual") {
      throw new Error("advance() only works with clock:'manual'");
    }
    for (let i = 0; i < samples; i++) {
      this._emitNext();
    }
  }

  private _emitNext(): void {
    if (this.state !== "present") return;

    let anyEmitted = false;

    for (const ch of this._trace.channels) {
      if (this._cursor >= ch.t.length) continue;
      anyEmitted = true;

      const end = Math.min(this._cursor + this._batchSize, ch.t.length);
      const count = end - this._cursor;

      const t = new Float64Array(count);
      const values = ch.axes.map(() => new Float32Array(count));

      for (let i = 0; i < count; i++) {
        t[i] = ch.t[this._cursor + i]!;
        for (let a = 0; a < ch.data.length; a++) {
          values[a]![i] = ch.data[a]![this._cursor + i]!;
        }
      }

      this._seq++;
      this.emitBatch({
        channel: ch.id as ChannelId,
        seq: this._seq,
        t,
        values,
      });
    }

    this._cursor += this._batchSize;

    if (!anyEmitted) {
      this.emit("end", undefined);
      if (this._timer !== undefined) {
        clearInterval(this._timer);
        this._timer = undefined;
      }
      this.setState("fading", "replay complete");
    }

    const health: HealthReport = {
      rateHz: this.capabilities[0]?.nominalRateHz ?? 0,
      jitterPct: 0,
      dropouts: 0,
      calibrated: true,
      mood: "calm",
      reason: "Replaying trace",
    };
    this.updateHealth(health);
  }
}

export function createReplaySpirit(
  trace: GhostTrace,
  config?: ReplayConfig,
): ReplaySpirit {
  return new ReplaySpirit(trace, config);
}
