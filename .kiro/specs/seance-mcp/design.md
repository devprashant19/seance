# Design Document — seance-mcp

## Overview

A small TypeScript package that wraps `seance-core` behind six MCP tools. The design favours a **thin adapter**: every computation (health, resampling, analysis, trace encode/decode) comes from `seance-core`, so MCP output can never disagree with what the apps show. Full tool contracts: `phases/phase-07-kiro-superpowers/seance-mcp-tools.md` (copy it to `docs/seance-mcp.md` when implementing).

## Architecture

```
Kiro (IDE / CLI)
   │  stdio JSON-RPC
   ▼
┌──────────────────────── packages/seance-mcp ────────────────────────┐
│ index.ts        parse flags/env → Config; create McpServer; register │
│ config.ts       { relayUrl?, room, fixturesDir, offline, maxRecordS } │
│ log.ts          stderr-only logger                                   │
│ tools/          one file per tool: schema + handler (pure-ish)       │
│   list-spirits.ts  read-stream.ts  record-trace.ts                   │
│   trace-stats.ts   run-experiment.ts  compare-traces.ts              │
│ live/                                                                │
│   observer.ts   relay client (role: observer), reconnect loop        │
│   buffers.ts    ring buffer per spirit × channel (default 60 s)      │
│ fixtures/                                                            │
│   store.ts      safe path resolution, list, load, atomic write       │
│ format.ts       quantity → { value, unit }, error envelope           │
└──────────────────────────────────────────────────────────────────────┘
        │ imports public API only
        ▼
seance-core: GhostTrace encode/decode/validate, computeHealth, resample,
             experiment registry (analyze), thresholds, units
```

## Components and Interfaces

```ts
interface Config {
  relayUrl?: string; room: string; fixturesDir: string;
  offline: boolean; maxRecordS: number; bufferS: number;
}

interface ToolContext {
  config: Config;
  mode(): 'live' | 'offline';
  observer?: Observer;          // undefined when offline
  fixtures: FixtureStore;
  core: typeof import('seance-core');
}

type ToolHandler<I, O> = (input: I, ctx: ToolContext) => Promise<O>;   // throws ToolError

class ToolError extends Error {
  constructor(public code:
    'OFFLINE' | 'SPIRIT_NOT_FOUND' | 'CHANNEL_NOT_FOUND' | 'TRACE_NOT_FOUND' | 'TRACE_INVALID' |
    'EXPERIMENT_NOT_FOUND' | 'INPUT_MISSING' | 'PATH_OUTSIDE_FIXTURES' | 'TOO_LONG',
    message: string, public hint?: string) { super(message); }
}

interface Observer {
  connected(): boolean;
  roster(): SpiritSummary[];                         // excludes observers
  buffer(spiritId: string, channel: ChannelId): RingBuffer;
  collect(spiritId: string, channels: ChannelId[], seconds: number, onProgress?: (s: number) => void): Promise<Record<ChannelId, SampleBatch[]>>;
  clock(spiritId: string): { offsetMs: number; driftPpm: number; rttMs: number } | undefined;
}

interface FixtureStore {
  resolve(idOrRelPath: string): string;              // throws PATH_OUTSIDE_FIXTURES / TRACE_NOT_FOUND
  list(): FixtureSummary[];
  load(idOrRelPath: string): GhostTrace;             // throws TRACE_INVALID
  writeAtomic(trace: GhostTrace): { path: string; bytes: number };
}
```

Handlers are registered in `index.ts`. Each tool file exports `{ name, description, inputSchema, handler }`, so tests can call handlers directly without MCP.

## Data Models

- Trace: `.seance` v1 (conventions §7), owned by `seance-core/src/trace/`.
- Quantities in output: `{ value: number, unit: Unit }` produced by `format.q()`. Keys ending in `Hz`, `Ms`, `Pct` are the only bare numbers allowed, because their unit is in the name.

## Live mode sequence (record_trace)

```
Kiro → record_trace(spirit, 20 s, label, experiment, inputs, expected)
  handler → observer.collect(spirit, channels, 20 s)  ── progress notifications ──► Kiro
          → core.trace.build({...})
          → bytes = core.trace.encode(trace); check core.trace.decode(bytes) ≡ trace
          → fixtures.writeAtomic(trace)                 ──► fixtures/traces/<id>.seance
          → analysis = experiment ? core.experiments.get(id).analyze(trace, inputs) : undefined
  ← { written, id, stats, analysis, nextStep }
Kiro hook H2 (PostToolUse, matcher @seance/record_trace) → generate regression test
```

## Error Handling

- All handler errors are `ToolError`s, mapped to an MCP tool result with `isError: true` and text `{"error", "message", "hint"}`.
- Unexpected exceptions become `INTERNAL` with the message (no stack on stdout; stack to stderr).
- Relay disconnect mid-record: return what was collected if ≥ 50% of the requested duration, with warning `"partial: relay disconnected after 12.4 s"`. Otherwise return `OFFLINE`.

## Testing Strategy

| Layer | Approach |
|---|---|
| Handlers | Vitest, calling handlers with a fake `ToolContext` (fixture store in a temp dir, fake observer) |
| Properties | fast-check: record→decode lossless; `compare_traces(a, a)` = 0; decimation preserves extremes; trace_stats ≡ computeHealth |
| Server | Spawn `dist/index.js`, send `initialize` + `tools/list`, assert six tools and clean stdout |
| Live | Spin up `seance-relay` in-process on a random port, connect a fake phone, assert the observer sees it and is invisible to the host |
| Security | Path traversal, symlink escape, unknown properties |

## Decisions

| Decision | Reason |
|---|---|
| stdio, not HTTP | Kiro launches local servers from `mcp.json`; no ports or auth |
| Observer role on the relay instead of embedding a WebSocket host | Works with the deployed relay too; zero changes to apps |
| JSON text output (+ structuredContent if available) | Works with every Kiro version; readable in chat |
| `likelyCauses` rule-based | Keeps the tool factual; Kiro does the reasoning, which is the story |
| Never auto-fill `expected` | Prevents circular regression tests |
