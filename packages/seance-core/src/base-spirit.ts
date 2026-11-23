import type { ChannelId } from "./channels.js";
import type {
  ChannelInfo,
  HealthReport,
  Mood,
  SampleBatch,
  Spirit,
  SpiritEvent,
  SpiritKind,
  SpiritState,
  SpiritStream,
  TransportKind,
} from "./spirit.js";
import { UnsupportedChannelError } from "./spirit.js";

type EventCallback = (payload: unknown) => void;

interface StreamEntry {
  subscribers: Set<(batch: SampleBatch) => void>;
  latest: SampleBatch | undefined;
}

export abstract class BaseSpirit implements Spirit {
  abstract readonly id: string;
  abstract readonly kind: SpiritKind;
  abstract readonly label: string;
  abstract readonly transport: TransportKind;
  abstract readonly capabilities: readonly ChannelInfo[];

  private _state: SpiritState = "idle";
  private readonly _listeners = new Map<SpiritEvent, Set<EventCallback>>();
  private readonly _streams = new Map<ChannelId, StreamEntry>();
  private _health: HealthReport = {
    rateHz: 0,
    jitterPct: 0,
    dropouts: 0,
    calibrated: false,
    mood: "calm",
    reason: "Waiting for data…",
  };
  private _lastHealthEmitMs = 0;

  get state(): SpiritState {
    return this._state;
  }

  protected setState(next: SpiritState, reason?: string): void {
    const prev = this._state;
    if (prev === next) return;
    this._state = next;
    this.emit("state", { state: next, prev, reason: reason ?? next });
  }

  abstract summon(): Promise<void>;

  async banish(): Promise<void> {
    this.setState("banished", "banished by user");
  }

  stream(channel: ChannelId): SpiritStream {
    if (!this.capabilities.some((c) => c.id === channel)) {
      throw new UnsupportedChannelError(channel);
    }

    let entry = this._streams.get(channel);
    if (!entry) {
      entry = { subscribers: new Set(), latest: undefined };
      this._streams.set(channel, entry);
    }

    const entryRef = entry;
    return {
      subscribe(cb: (batch: SampleBatch) => void): () => void {
        entryRef.subscribers.add(cb);
        return () => {
          entryRef.subscribers.delete(cb);
        };
      },
      latest(): SampleBatch | undefined {
        return entryRef.latest;
      },
    };
  }

  health(): HealthReport {
    return this._health;
  }

  on(event: SpiritEvent, cb: EventCallback): () => void {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
    };
  }

  protected emit(event: SpiritEvent, payload: unknown): void {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(payload);
        } catch {
          // subscriber errors should not crash the spirit
        }
      }
    }
  }

  protected emitBatch(batch: SampleBatch): void {
    if (this._state === "banished") return;

    const entry = this._streams.get(batch.channel);
    if (entry) {
      entry.latest = batch;
      for (const cb of entry.subscribers) {
        try {
          cb(batch);
        } catch {
          // subscriber errors should not crash the spirit
        }
      }
    }
  }

  protected updateHealth(report: HealthReport, nowMs?: number): void {
    this._health = report;
    const now = nowMs ?? Date.now();
    if (now - this._lastHealthEmitMs >= 250) {
      this._lastHealthEmitMs = now;
      this.emit("health", report);
    }
  }

  protected moodRank(mood: Mood): number {
    const ranks: Record<Mood, number> = {
      calm: 0,
      uneasy: 1,
      restless: 2,
      fading: 3,
    };
    return ranks[mood];
  }
}
