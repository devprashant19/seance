import type { ChannelId } from "./channels.js";
import type { Unit } from "./units.js";

export interface TraceChannel {
  readonly id: ChannelId;
  readonly unit: Unit;
  readonly axes: readonly string[];
  readonly t: readonly number[];
  readonly data: readonly (readonly number[])[];
}

export interface GhostTrace {
  readonly format: "seance";
  readonly version: 1;
  readonly id: string;
  readonly spiritId: string;
  readonly spiritKind: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly channels: readonly TraceChannel[];
  readonly meta?: Record<string, unknown>;
}

export function createTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `trace-${ts}-${rand}`;
}

export function validateTrace(trace: unknown): trace is GhostTrace {
  if (typeof trace !== "object" || trace === null) return false;
  const t = trace as Record<string, unknown>;
  if (t.format !== "seance") return false;
  if (t.version !== 1) return false;
  if (typeof t.id !== "string") return false;
  if (typeof t.spiritId !== "string") return false;
  if (typeof t.spiritKind !== "string") return false;
  if (typeof t.startedAt !== "string") return false;
  if (typeof t.durationMs !== "number") return false;
  if (!Array.isArray(t.channels)) return false;

  for (const ch of t.channels as unknown[]) {
    if (typeof ch !== "object" || ch === null) return false;
    const c = ch as Record<string, unknown>;
    if (typeof c.id !== "string") return false;
    if (typeof c.unit !== "string") return false;
    if (!Array.isArray(c.axes)) return false;
    if (!Array.isArray(c.t)) return false;
    if (!Array.isArray(c.data)) return false;
  }

  return true;
}
