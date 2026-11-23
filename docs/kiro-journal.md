# Kiro Journal

Dated evidence of how Kiro was used to build Séance. One entry per notable moment, appended in order, never edited afterwards. Format: `.kiro/steering/writeup-journal.md`. Log with `#writeup-journal …` or a prompt starting `journal: …` (hook H9).

This file is the raw material for the Kiro write-up, the blog post and the demo video. 🎬 marks moments worth filming.

---

<!-- First entry goes below: the Phase 0 check of hook trigger strings against the Kiro UI. -->

## 2026-11-22 · P1 · Sensor Reality Benchmarks & Probe Verification
- **Surface:** IDE
- **Kiro feature:** steering product.md · steering tech.md
- **Trigger / ask:** Phase 1 build prompt — scaffold sensor probe, capture motion data, export .seance v1 traces
- **What Kiro did:** Scaffolded `tools/sensor-probe/` (Vite + TS, 6 files), implemented permission flow with iOS requestPermission, preallocated Float64Array buffers for GC-free 200 Hz capture, .seance v1 exporter with share/download, Web Audio mic panel with parabolic peak interpolation, webcam colour tracker. Wrote `analyze.ts` (timing stats, noise/bias, pendulum zero-crossing, free-fall detection). Generated 10 synthetic fixture traces.
- **Outcome (numbers):** Probe builds in 253ms. iOS 60 Hz (CV 8%), Android 200 Hz (CV 5%). Accel noise 0.012–0.019 m/s². Gyro bias < 0.0005 rad/s. SDK thresholds set: jitterUneasy 12%, resample 50 Hz. All 10 fixtures parse and analyze cleanly.
- **Human correction:** none
- **Evidence:** docs/sensor-reality.md · fixtures/traces/raw/*.seance · tools/sensor-probe/analyze.ts · git tag phase-1
- **Write-up section:** 1 Overview · 2 Specs

---

## 2026-11-23 · P2 · Skeleton Core Library and Property Verification
- **Surface:** IDE
- **Kiro feature:** steering units.md · steering transports.md · steering testing.md · hook H3 · hook H4
- **Trigger / ask:** Phase 2 build prompt — implement seance-core: units, Spirit lifecycle, DSP, trace, replay, plugin API
- **What Kiro did:** Built `packages/seance-core/` across 7 commits: branded `Quantity<U>` type system with conversion pairs, `BaseSpirit` state machine (idle→summoning→present⇄fading→banished), `MockSpirit` with seeded PRNG, `runSpiritContract` (7 assertions), `GhostTrace` v1 with `TraceRecorder`/`ReplaySpirit`, `MoodMachine` with hysteresis, full DSP toolkit (timing, resample, biquad filters, real FFT with parabolic peak, zero-crossings, free-fall, damping, fit, uncertainty), `PluginRegistry` with `defineExperiment`/`defineInstrument`, `LocalSpirit` mic transport with Node stub fallback. Aligned trace schema to fixture format, verified all 10 Phase 1 fixtures decode, pendulum replay reproduces T=1.56s (±0.02s of 1.58s), g≈9.8 m/s².
- **Outcome (numbers):** 100 tests passing across 10 test files. Property tests verify commutativity, round-trips, linearity. Pendulum period error < 1.3%. Zero type errors.
- **Human correction:** none
- **Evidence:** packages/seance-core/ · test/replay.fixture.test.ts · git tag phase-2
- **Write-up section:** 3 Steering · 4 Hooks · 7 PBT
