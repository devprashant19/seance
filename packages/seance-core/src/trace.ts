import type { ChannelId } from "./channels.js";
import type { Unit } from "./units.js";

export interface TraceChannel {
  readonly id: ChannelId;
  readonly unit: Unit;
  readonly axes: readonly string[];
  readonly t: readonly number[];
  readonly data: readonly (readonly number[])[];
}

export interface TraceDevice {
  readonly kind?: string;
  readonly platform?: string;
  readonly userAgent?: string;
  readonly model?: string;
}

export interface GhostTrace {
  readonly format: "seance-trace" | "seance";
  readonly version: 1;
  readonly id: string;
  readonly label?: string;
  readonly createdAt?: string;
  readonly experiment?: string;
  readonly device?: TraceDevice;
  readonly clock?: unknown;
  readonly calibration?: unknown;
  readonly inputs?: Record<string, unknown>;
  readonly expected?: unknown;
  readonly notes?: string;
  readonly spiritId?: string;
  readonly spiritKind?: string;
  readonly startedAt?: string;
  readonly durationMs?: number;
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
  if (t.format !== "seance-trace" && t.format !== "seance") return false;
  if (t.version !== 1) return false;
  if (typeof t.id !== "string") return false;

  const channels = t.channels;
  if (channels == null) return false;

  if (Array.isArray(channels)) {
    for (const ch of channels as unknown[]) {
      if (!isValidChannelObj(ch)) return false;
    }
  } else if (typeof channels === "object") {
    for (const ch of Object.values(channels as Record<string, unknown>)) {
      if (!isValidChannelData(ch)) return false;
    }
  } else {
    return false;
  }

  return true;
}

function isValidChannelObj(ch: unknown): boolean {
  if (typeof ch !== "object" || ch === null) return false;
  const c = ch as Record<string, unknown>;
  if (typeof c.id !== "string") return false;
  return isValidChannelData(ch);
}

function isValidChannelData(ch: unknown): boolean {
  if (typeof ch !== "object" || ch === null) return false;
  const c = ch as Record<string, unknown>;
  if (typeof c.unit !== "string") return false;
  if (!Array.isArray(c.axes)) return false;
  if (!Array.isArray(c.t)) return false;
  if (!Array.isArray(c.data)) return false;
  return true;
}

interface RawTraceJson {
  format: string;
  version: number;
  id: string;
  channels: Record<string, { unit: string; axes: string[]; t: number[]; data: number[][] }> | TraceChannel[];
  [key: string]: unknown;
}

export function decodeTrace(raw: unknown): GhostTrace {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid trace: not an object");
  }

  const r = raw as RawTraceJson;
  if (r.format !== "seance-trace" && r.format !== "seance") {
    throw new Error(`Invalid trace format: ${r.format}`);
  }
  if (r.version !== 1) {
    throw new Error(`Unsupported trace version: ${r.version}`);
  }

  let channels: TraceChannel[];

  if (Array.isArray(r.channels)) {
    channels = r.channels as TraceChannel[];
  } else if (typeof r.channels === "object" && r.channels !== null) {
    channels = Object.entries(r.channels).map(([id, ch]) => ({
      id: id as ChannelId,
      unit: ch.unit as Unit,
      axes: ch.axes,
      t: ch.t,
      data: ch.data,
    }));
  } else {
    throw new Error("Invalid trace: missing channels");
  }

  return {
    format: r.format as GhostTrace["format"],
    version: 1,
    id: r.id as string,
    label: r.label as string | undefined,
    createdAt: r.createdAt as string | undefined,
    experiment: r.experiment as string | undefined,
    device: r.device as TraceDevice | undefined,
    clock: r.clock,
    calibration: r.calibration,
    inputs: r.inputs as Record<string, unknown> | undefined,
    expected: r.expected,
    notes: r.notes as string | undefined,
    spiritId: r.spiritId as string | undefined,
    spiritKind: (r.spiritKind ?? (r.device as TraceDevice | undefined)?.kind) as string | undefined,
    startedAt: (r.startedAt ?? r.createdAt) as string | undefined,
    durationMs: r.durationMs as number | undefined,
    channels,
    meta: r.meta as Record<string, unknown> | undefined,
  };
}

export function encodeTrace(trace: GhostTrace): Record<string, unknown> {
  const channelMap: Record<string, { unit: string; axes: string[]; t: number[]; data: number[][] }> = {};
  for (const ch of trace.channels) {
    channelMap[ch.id] = {
      unit: ch.unit,
      axes: [...ch.axes],
      t: [...ch.t],
      data: ch.data.map((a) => [...a]),
    };
  }

  return {
    format: "seance-trace",
    version: 1,
    id: trace.id,
    label: trace.label ?? null,
    createdAt: trace.createdAt ?? trace.startedAt ?? null,
    experiment: trace.experiment ?? null,
    device: trace.device ?? null,
    clock: trace.clock ?? null,
    calibration: trace.calibration ?? null,
    inputs: trace.inputs ?? null,
    channels: channelMap,
    expected: trace.expected ?? null,
    notes: trace.notes ?? null,
  };
}
