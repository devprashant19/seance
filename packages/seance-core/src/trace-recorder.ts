import type { ChannelId } from "./channels.js";
import type { SampleBatch, Spirit } from "./spirit.js";
import type { GhostTrace, TraceChannel } from "./trace.js";
import { createTraceId } from "./trace.js";

interface ChannelBuffer {
  readonly id: ChannelId;
  readonly unit: string;
  readonly axes: readonly string[];
  t: number[];
  data: number[][];
}

export class TraceRecorder {
  private readonly _spirit: Spirit;
  private readonly _buffers = new Map<ChannelId, ChannelBuffer>();
  private readonly _unsubs: (() => void)[] = [];
  private _startedAt: string | undefined;
  private _startMs = 0;
  private _recording = false;

  constructor(spirit: Spirit) {
    this._spirit = spirit;
  }

  get recording(): boolean {
    return this._recording;
  }

  start(channels?: readonly ChannelId[]): void {
    if (this._recording) return;
    this._recording = true;
    this._startedAt = new Date().toISOString();
    this._startMs = Date.now();

    const targets = channels ?? this._spirit.capabilities.map((c) => c.id);

    for (const chId of targets) {
      const cap = this._spirit.capabilities.find((c) => c.id === chId);
      if (!cap) continue;

      const buffer: ChannelBuffer = {
        id: chId,
        unit: cap.unit,
        axes: [...cap.axes],
        t: [],
        data: cap.axes.map(() => []),
      };
      this._buffers.set(chId, buffer);

      const stream = this._spirit.stream(chId);
      const unsub = stream.subscribe((batch: SampleBatch) => {
        this._onBatch(buffer, batch);
      });
      this._unsubs.push(unsub);
    }
  }

  stop(): GhostTrace {
    this._recording = false;

    for (const unsub of this._unsubs) {
      unsub();
    }
    this._unsubs.length = 0;

    const durationMs = Date.now() - this._startMs;

    const channels: TraceChannel[] = [];
    for (const buf of this._buffers.values()) {
      channels.push({
        id: buf.id,
        unit: buf.unit as TraceChannel["unit"],
        axes: buf.axes,
        t: buf.t,
        data: buf.data,
      });
    }

    const trace: GhostTrace = {
      format: "seance-trace",
      version: 1,
      id: createTraceId(),
      spiritId: this._spirit.id,
      spiritKind: this._spirit.kind,
      startedAt: this._startedAt ?? new Date().toISOString(),
      durationMs,
      channels,
    };

    this._buffers.clear();
    return trace;
  }

  private _onBatch(buffer: ChannelBuffer, batch: SampleBatch): void {
    for (let i = 0; i < batch.t.length; i++) {
      buffer.t.push(batch.t[i]!);
      for (let a = 0; a < batch.values.length; a++) {
        buffer.data[a]!.push(batch.values[a]![i]!);
      }
    }
  }
}
