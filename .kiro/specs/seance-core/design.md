# Design Document — seance-core

## Overview

`seance-core` is a framework-free TypeScript library. It has four layers:

1. **Types** — units, spirit, channel, batch, health, trace, experiment/instrument definitions.
2. **Transports** — produce `Spirit`s (`mock`, `replay`, `local` here; `phone-bridge` in its own spec).
3. **Signal toolkit** — pure functions over uniform or irregular sample arrays.
4. **Plugins** — `defineExperiment`, `defineInstrument`, registry.

Everything except the `local` transport runs in Node, so Vitest + fast-check cover the whole package without a browser.

Detailed module notes live in `phases/phase-02-skeleton-core/api-design.md`, algorithms in `signal-algorithms.md`, properties in `property-tests.md`, moods in `health-model.md`.

## Architecture

```
            ┌────────────── apps (poltergeist-lab, banshee-choir) ──────────────┐
            │   import only from package entry points (hook H5)                  │
            └──────────────▲───────────────────────────────▲────────────────────┘
                           │ Spirit / SpiritStream         │ Experiment / Instrument
┌──────────────────────────┴───────────────┐   ┌───────────┴──────────────────────┐
│ transports/                               │   │ plugins/                          │
│  mock · replay · local · (phone-bridge)   │   │  defineExperiment · defineInstrument│
│  contract.ts (runSpiritContract)          │   │  registry                         │
└───────────┬───────────────────────────────┘   └───────────┬──────────────────────┘
            │ SampleBatch                                   │ GhostTrace in, ExperimentResult out
┌───────────▼──────────┐ ┌──────────────┐ ┌────────────────▼──────────────┐
│ health/               │ │ trace/        │ │ signal/                        │
│  window stats, moods  │ │  encode/decode│ │  timing · resample · filters   │
│  thresholds.ts        │ │  recorder     │ │  fft · events · damping · fit  │
└───────────────────────┘ └──────────────┘ │  uncertainty                   │
                                            └───────────────────────────────┘
                        units.ts (used by every layer)
```

### Data flow (live)

`device event → transport edge (convert units, stamp time) → batcher (~50 ms) → SpiritStream subscribers`
`                                                          ↘ HealthMonitor (sliding window) → mood + reason`
`                                                          ↘ TraceRecorder (when recording)`

### Data flow (analysis)

`GhostTrace → channel arrays → signal.timing (jitter report) → signal.resample → filters → events/fft → experiment.analyze → ExperimentResult`

Analysis is **always** run on a trace (live runs are recorded into an in-memory trace first). That makes live and replay identical and makes every result reproducible.

## Components and Interfaces

### units.ts
- `type Unit`, `type Quantity<U>`, `q(value, unit)`, `valueOf(q)`.
- `add/sub<U>(a: Quantity<U>, b: Quantity<U>): Quantity<U>`; `scale<U>(a, k: number)`.
- Named derivation helpers instead of generic `mul/div`: `accelFromOmegaR(ω: Quantity<'rad/s'>, r: Quantity<'m'>): Quantity<'m/s^2'>`, `periodToFrequency(T: Quantity<'s'>): Quantity<'Hz'>`, etc. Experiments add their own helpers next to their theory.
- `convert(x, from, to)` with a table of linear factors; `deg/s → rad/s` used at transport edges.

### spirit.ts
Interfaces exactly as conventions §6. Plus:
- `abstract class BaseSpirit` implementing the state machine, event emitter, per-channel `SpiritStream` fan-out, and health monitor wiring. Transports extend it and call `this.emitBatch(batch)` and `this.setState(state, reason?)`.
- Errors: `UnsupportedChannelError`, `PermissionDeniedError`, `TransportUnavailableError`, `SpiritLostError`.

State machine:

```
idle ──summon()──► summoning ──first batch──► present ◄──batch── fading
  ▲                   │                          │  no data > 1 s ──►┘
  │                   └──failure──► error        └──banish()──► banished
  └────────────── (new spirit object required after banished) ──────────
```

### health/
- `HealthMonitor` keeps a ring buffer of the last 2 s of timestamps and values per channel.
- `computeHealth(window, thresholds): HealthReport` — pure.
- `moodFrom(stats, thresholds, previousMood, msSinceChange)` — pure, with hysteresis.
- `thresholds.ts` — the only place numbers live (`jitterUneasy`, `jitterRestless`, `dropoutRestless`, `noiseRestless`, `fadingAfterMs`, `minMoodHoldMs`). Initial values from research file 03, re-tuned with Phase 1 data.

### trace/
- `encodeTrace(trace): string` — stable key order, numbers via a fixed formatter (no exponent noise), `\n` line endings.
- `decodeTrace(text): GhostTrace` — validates with a hand-written validator (no heavy schema lib) and returns errors with JSON paths.
- `TraceRecorder` — `start(spirit, channels, meta)`, `stop(): GhostTrace`.
- `traceId(date, experiment, deviceShort)` → `2026-11-22T10-31-05Z_pendulum-g_pixel7`.

### transports/
- `mock.ts` — `createMockSpirit({ seed, channels: { gyro: { signal: dampedSine(...), rateHz, jitterPct, dropoutProb, noise } } })`. Uses a seeded PRNG (e.g. mulberry32) so runs are reproducible.
- `replay.ts` — `createReplaySpirit(trace, { mode: 'realtime' | 'fast', speed, loop })`. Real-time mode schedules by `requestAnimationFrame` in browsers and `setTimeout` in Node.
- `local.ts` — laptop mic (`getUserMedia` + AnalyserNode → `audio.level`, `audio.spectrum`) and webcam placeholder for Watcher (Phase 9). DOM-only; excluded from Node test runs.
- `contract.ts` — `runSpiritContract(name, makeSpirit)` registers Vitest tests every transport must pass.

### signal/
| File | Exports |
|---|---|
| `timing.ts` | `intervals(t)`, `jitterReport(t)` → `{meanMs, medianMs, p95Ms, cvPct, gaps[]}` |
| `resample.ts` | `resampleLinear(t, x, rateHz, {maxGapMs})`, `resampleCubic(...)` → `{t, x, gaps}` |
| `filters.ts` | `lowPass1`, `highPass1`, `biquadLowPass`, `filtfilt`, `complementary`, `kalman1d` |
| `fft.ts` | `rfft(x)`, `window(name, N)`, `spectrum(x, fs, {window})` → `{freqs, mag, df}`, `peakFrequency(spec)` |
| `events.ts` | `zeroCrossings(t, x, {hysteresis, direction})`, `findPeaks(x, {prominence, distance})`, `windowsBelow(t, x, threshold, minMs)` |
| `damping.ts` | `logDecrement(peaks)`, `dampingRatio(δ)` |
| `fit.ts` | `linearFit(x, y, w?)` → `{slope, intercept, seSlope, seIntercept, cov, r2}` |
| `uncertainty.ts` | `relQuadrature([...])`, `propagate(f, x, σ)` (numeric partials), `combine` helpers |

All functions take typed arrays (`Float64Array` for time, `Float32Array`/`Float64Array` for values), never mutate inputs, and are deterministic.

### plugins/
- `defineExperiment(def)` validates and freezes the definition; returns `Experiment` with `run(trace, inputs)` that wraps `analyze` (catches missing channels → low-confidence result).
- `defineInstrument(def)` for the Choir.
- `registry.ts` — `registerExperiment`, `listExperiments`, `getExperiment(id)`; apps use `import.meta.glob` to auto-register plugin folders.

### Package exports

```json
{
  "name": "seance-core",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./units": "./dist/units.js",
    "./signal": "./dist/signal/index.js",
    "./trace": "./dist/trace/index.js",
    "./testing": "./dist/testing/index.js"
  }
}
```

`seance-core/testing` exports `runSpiritContract`, mock signal builders and fast-check arbitraries (`arbTrace`, `arbJitteredSine`) for app-level tests and hook-generated tests.

## Data Models

- `SampleBatch`, `HealthReport`, `Spirit`, `Measured`, `ExperimentResult` — conventions §6.
- `GhostTrace` — conventions §7. TypeScript:

```ts
interface GhostTrace {
  format: 'seance-trace'; version: 1;
  id: string; label: string; createdAt: string;
  experiment: string | null;
  device: { kind: SpiritKind; platform: 'android' | 'ios' | 'desktop' | 'unknown'; userAgent: string; model?: string };
  clock: { offsetMs: number; driftPpm: number; rttMs: number } | null;
  calibration: Calibration | null;
  inputs: Record<string, { value: number; uncertainty: number; unit: Unit }>;
  channels: Record<string, { unit: Unit; axes: string[]; t: number[]; data: number[][] }>;
  expected: { quantity: string; value: number; unit: Unit; tolerance: number } | null;
  notes: string;
}
interface Calibration { accelBias?: [number, number, number]; accelScale?: [number, number, number]; gyroBias?: [number, number, number]; method: string; at: string }
```

## Error Handling

| Situation | Behaviour |
|---|---|
| Unknown channel | `UnsupportedChannelError` (sync throw) |
| Permission denied (mic) | spirit → `error`, `PermissionDeniedError` with a plain-language message |
| No data > 1 s | mood `fading`, state `fading`; recovers automatically on next batch |
| Decode failure | `TraceDecodeError` with a list of `{path, message}` |
| Newer trace version | `TraceVersionError` ("This haunting was recorded by a newer Séance") |
| Analysis on bad data | never throws; returns `confidence: 'low'` + warnings |
| NaN/Infinity in samples | dropped at the transport edge and counted as dropouts |

## Testing Strategy

- **Unit tests** per module (Vitest, Node).
- **Property-based tests** for every `**Property:**` in requirements (fast-check, `numRuns` 200 locally, 1000 in CI nightly if time). Full list: `phases/phase-02-skeleton-core/property-tests.md`.
- **Contract tests**: `runSpiritContract` against `mock` and `replay` (and later `phone-bridge`).
- **Fixture tests**: every `fixtures/traces/*.seance` with `expected` gets a replay regression test (hook H2, Phase 5).
- **Hooks**: H3 runs contract tests on transport changes; H4 runs type-check + module PBT on signal/experiment changes.
- **Coverage goal**: ≥ 80% lines on `signal/`, `trace/`, `units.ts`, `health/`.
