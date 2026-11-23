# Implementation Plan — seance-core

Phase 2 (Mon Nov 23 – Tue Nov 24). Tasks are ordered so a trace can be replayed by the end of Monday and the signal toolkit + PBT are green by the end of Tuesday. Optional tasks are marked `*`.

- [x] 1. Package scaffold
  - [x] 1.1 Create `packages/seance-core` with `package.json` (exports map from design.md), `tsconfig.json` (strict, `noUncheckedIndexedAccess`), Vitest config, `src/index.ts`
    - _Requirements: 14.1, 14.3_
  - [x] 1.2 Add fast-check and a shared `test/arbitraries.ts` (seeded, re-exported via `seance-core/testing`)
    - _Requirements: 14.1_

- [x] 2. Units
  - [x] 2.1 Implement `Unit`, `Quantity<U>`, `q`, `add`, `sub`, `scale`, `convert` with the factor table
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 2.2 Add type-level tests (`expectTypeOf` / `// @ts-expect-error`) proving `add(q(1,'m'), q(1,'s'))` fails
    - _Requirements: 1.2_
  - [x] 2.3 Property tests: conversion round-trip and linearity
    - _Requirements: 1.5, 1.6_

- [x] 3. Spirit core
  - [x] 3.1 Define `Spirit`, `SpiritStream`, `ChannelInfo`, `SampleBatch`, `HealthReport`, error classes
    - _Requirements: 2.1, 2.4_
  - [x] 3.2 Implement `BaseSpirit` (state machine, event emitter, per-channel fan-out, unsubscribe)
    - _Requirements: 2.2, 2.3, 2.5_
  - [x] 3.3 Implement `runSpiritContract(name, makeSpirit)` in `transports/contract.ts`
    - _Requirements: 3.4, 2.7, 2.8_

- [x] 4. Mock transport
  - [x] 4.1 Seeded PRNG + signal builders (sine, damped sine, step, free-fall window, noise, constant)
    - _Requirements: 4.1, 4.3_
  - [x] 4.2 Rate, jitter, dropout and noise injection; batching at ~50 ms
    - _Requirements: 4.2_
  - [x] 4.3 Run the contract suite against mock
    - _Requirements: 3.4_

- [x] 5. Ghost Trace v1
  - [x] 5.1 `GhostTrace` types + `encodeTrace` with stable key order and fixed number formatting
    - _Requirements: 5.1, 5.5, 5.7_
  - [x] 5.2 `decodeTrace` with JSON-path error reporting and version check
    - _Requirements: 5.2, 5.3_
  - [x] 5.3 `TraceRecorder` (subscribe, collect, stop → trace)
    - _Requirements: 5.4_
  - [x] 5.4 Property tests: encode/decode round-trip, deterministic encoding
    - _Requirements: 5.6, 5.7_
  - [x] 5.5 Convert the 10 Phase 1 probe traces to v1 and commit them to `fixtures/traces/raw/`
    - _Requirements: 5.1_

- [x] 6. Replay transport
  - [x] 6.1 `createReplaySpirit(trace, {mode, speed, loop})` producing a `revenant`
    - _Requirements: 6.1, 6.3, 6.4_
  - [x] 6.2 Real-time scheduling (rAF in browser, timers in Node) within one frame
    - _Requirements: 6.2_
  - [x] 6.3 Contract suite + property test: replay → re-record equals original
    - _Requirements: 6.5, 3.4_

- [ ] 7. Health model
  - [ ] 7.1 `thresholds.ts` seeded with research defaults, then Phase 1 numbers
    - _Requirements: 7.2_
  - [ ] 7.2 `HealthMonitor` sliding-window stats (rate, jitter, dropouts from seq gaps, noise floor when still)
    - _Requirements: 7.1, 7.3_
  - [ ] 7.3 `moodFrom` with hysteresis and plain-language reasons
    - _Requirements: 7.4, 7.5_
  - [ ] 7.4 Property test: mood monotonicity
    - _Requirements: 7.6_
  - [ ] 7.5 Property test: mock at rate r reports rateHz within 1%
    - _Requirements: 4.4_

- [ ] 8. Timing and resampling
  - [ ] 8.1 `intervals`, `jitterReport` (mean, median, p95, CV %, gaps)
    - _Requirements: 8.1_
  - [ ] 8.2 `resampleLinear` with gap handling; `resampleCubic`*
    - _Requirements: 8.2, 8.3_
  - [ ] 8.3 Property test: jittered sine keeps its frequency after resampling
    - _Requirements: 8.4_

- [ ] 9. Filters
  - [ ] 9.1 `lowPass1`, `highPass1`, `biquadLowPass`, `filtfilt`
    - _Requirements: 9.1, 9.2_
  - [ ] 9.2 `complementary` (gyro + accel tilt) and `kalman1d`
    - _Requirements: 9.3, 9.4_
  - [ ] 9.3 Property tests: constant passthrough, pass-band/stop-band amplitude
    - _Requirements: 9.5, 9.6_

- [ ] 10. Spectral analysis
  - [ ] 10.1 Radix-2 real FFT + windows (Hann, Hamming, rect) + `spectrum` with `df`
    - _Requirements: 10.1, 10.2_
  - [ ] 10.2 `peakFrequency` with parabolic interpolation
    - _Requirements: 10.3_
  - [ ] 10.3 Property tests: Parseval; between-bin peak accuracy
    - _Requirements: 10.4, 10.5_

- [ ] 11. Event detection
  - [ ] 11.1 `zeroCrossings` with hysteresis + sub-sample interpolation
    - _Requirements: 11.1_
  - [ ] 11.2 `findPeaks` (prominence, distance), `windowsBelow`
    - _Requirements: 11.2, 11.3_
  - [ ] 11.3 Property tests: crossing interval = T; sub-hysteresis noise adds no crossings
    - _Requirements: 11.4, 11.5_

- [ ] 12. Damping, fits, uncertainty
  - [ ] 12.1 `logDecrement`, `dampingRatio`
    - _Requirements: 12.1_
  - [ ] 12.2 `linearFit` (OLS + weighted) with standard errors, covariance, R²
    - _Requirements: 12.2_
  - [ ] 12.3 `relQuadrature`, `propagate` (numeric partials)
    - _Requirements: 12.3_
  - [ ] 12.4 Property tests: exact-line fit; damped-sine ζ recovery
    - _Requirements: 12.4, 12.5_

- [ ] 13. Plugin API
  - [ ] 13.1 `defineExperiment` with definition-time validation and safe `run()` wrapper
    - _Requirements: 13.1, 13.2, 13.5_
  - [ ] 13.2 `defineInstrument`
    - _Requirements: 13.3_
  - [ ] 13.3 Registry + example "hello" experiment used only in tests
    - _Requirements: 13.4_

- [ ] 14. Local transport (browser)
  - [ ] 14.1 Laptop mic → `audio.level` + `audio.spectrum` banshee spirit
    - _Requirements: 3.2_
  - [ ]* 14.2 Webcam stub for Watcher (real work in Phase 9 wow/stretch)
    - _Requirements: 3.2_

- [ ] 15. Wire into CI and hooks
  - [ ] 15.1 `pnpm -F seance-core test` and `typecheck` in CI
    - _Requirements: 14.3_
  - [ ] 15.2 Enable hooks H3 (spirit-contract) and H4 (physics-guard); trigger each once and log it in `docs/kiro-journal.md`
    - _Requirements: 3.4_
  - [ ]* 15.3 Coverage report ≥ 80% on signal/, trace/, units, health/ (pending full Istanbul sweep)
    - _Requirements: 14.3_
