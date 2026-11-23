import { BaseSpirit } from "../base-spirit.js";
import type { ChannelId } from "../channels.js";
import type {
  ChannelInfo,
  HealthReport,
  SpiritKind,
  TransportKind,
} from "../spirit.js";

export type SignalFn = (t: number) => number;

export const signals = {
  sine:
    (freq: number, amp = 1): SignalFn =>
    (t) =>
      amp * Math.sin(2 * Math.PI * freq * t),

  dampedSine:
    (freq: number, amp = 1, decay = 1): SignalFn =>
    (t) =>
      amp * Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t),

  step:
    (threshold: number, low = 0, high = 1): SignalFn =>
    (t) =>
      t >= threshold ? high : low,

  freeFallWindow:
    (start: number, duration: number, g = 9.81): SignalFn =>
    (t) =>
      t >= start && t < start + duration ? 0 : g,

  constant:
    (value: number): SignalFn =>
    () =>
      value,
} as const;

export interface MockSpiritConfig {
  readonly seed: number;
  readonly kind?: SpiritKind;
  readonly channels: ReadonlyArray<{
    readonly id: ChannelId;
    readonly unit: ChannelInfo["unit"];
    readonly axes: readonly string[];
    readonly nominalRateHz: number;
    readonly signals: readonly SignalFn[];
  }>;
  readonly batchMs?: number;
  readonly clock?: "real" | "manual";
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

export class MockSpirit extends BaseSpirit {
  readonly id: string;
  readonly kind: SpiritKind;
  readonly label: string;
  readonly transport: TransportKind = "mock";
  readonly capabilities: readonly ChannelInfo[];

  private readonly _config: MockSpiritConfig;
  private readonly _rand: () => number;
  private readonly _batchMs: number;
  private _seq = 0;
  private _elapsedMs = 0;
  private _timer: ReturnType<typeof setInterval> | undefined;

  constructor(config: MockSpiritConfig) {
    super();
    this._config = config;
    this._rand = seededRandom(config.seed);
    this._batchMs = config.batchMs ?? 50;
    this.id = `mock-${config.seed}`;
    this.kind = config.kind ?? "poltergeist";
    this.label = `Mock ${this.kind} #${config.seed}`;
    this.capabilities = config.channels.map((ch) => ({
      id: ch.id,
      unit: ch.unit,
      axes: ch.axes,
      nominalRateHz: ch.nominalRateHz,
    }));
  }

  async summon(): Promise<void> {
    this.setState("summoning", "connecting mock transport");
    this.setState("present", "mock transport ready");

    if (this._config.clock !== "manual") {
      this._timer = setInterval(() => {
        this._tick();
      }, this._batchMs);
    }
  }

  override async banish(): Promise<void> {
    if (this._timer !== undefined) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
    await super.banish();
  }

  advance(ms: number): void {
    if (this._config.clock !== "manual") {
      throw new Error("advance() only works with clock:'manual'");
    }
    const steps = Math.floor(ms / this._batchMs);
    for (let i = 0; i < steps; i++) {
      this._tick();
    }
  }

  private _tick(): void {
    if (this.state !== "present") return;

    const batchSec = this._batchMs / 1000;
    const tStart = this._elapsedMs / 1000;
    this._elapsedMs += this._batchMs;

    for (const ch of this._config.channels) {
      const samplesPerBatch = Math.max(
        1,
        Math.round((ch.nominalRateHz * this._batchMs) / 1000),
      );
      const t = new Float64Array(samplesPerBatch);
      const values = ch.signals.map(() => new Float32Array(samplesPerBatch));

      for (let i = 0; i < samplesPerBatch; i++) {
        const frac = i / samplesPerBatch;
        const tSample = tStart + frac * batchSec;
        t[i] = tSample * 1000;

        for (let a = 0; a < ch.signals.length; a++) {
          const jitter = (this._rand() - 0.5) * 0.001;
          values[a]![i] = ch.signals[a]!(tSample) + jitter;
        }
      }

      this._seq++;
      this.emitBatch({
        channel: ch.id,
        seq: this._seq,
        t,
        values,
      });
    }

    const health: HealthReport = {
      rateHz: this._config.channels[0]?.nominalRateHz ?? 0,
      jitterPct: this._rand() * 2,
      dropouts: 0,
      calibrated: true,
      mood: "calm",
      reason: "Mock transport nominal",
    };
    this.updateHealth(health, this._elapsedMs);
  }
}

export function createMockSpirit(config: MockSpiritConfig): MockSpirit {
  return new MockSpirit(config);
}
