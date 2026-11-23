# Implementation Plan — Poltergeist Lab

- [x] 1. Lab shell and registry
- [x] 1.1 `registry.ts` auto-discovering `src/experiments/*/index.ts`, validating id/channels/inputs, skipping invalid modules with a dev warning
  - _Requirements: 1.1, 1.4_
- [x] 1.2 Experiment library page with cards (spooky + plain title, spirits needed, time, live/replay availability)
  - _Requirements: 1.2, 1.3_

- [ ] 2. Runner
- [ ] 2.1 `ExperimentRunner` state machine SETUP → READY_CHECK → RECORDING → ANALYZING → RESULT (+ ERROR)
  - _Requirements: 2.1, 2.3, 2.5, 2.6_
- [ ] 2.2 Safety notice panel gating Start
  - _Requirements: 2.2, 8.1_
- [ ] 2.3 `LiveChart` (uPlot ring buffers, ≤ 30 Hz updates) + avatar with mood badge beside it
  - _Requirements: 2.4_
- [ ] 2.4 Trace recording via `seance-core` `TraceRecorder` (channels, inputs, device, clock, calibration, health summary)
  - _Requirements: 2.5, 9.2_

- [x] 3. Inputs
- [x] 3.1 `InputsForm` with units, default uncertainties, valid ranges, mm/cm → m conversion
  - _Requirements: 3.1, 3.2, 3.3_
- [x]* 3.2 Property test: unit conversion round-trip (P-LAB-1)
  - _Requirements: 3.2_

- [x] 4. Results and Oracle
- [x] 4.1 Result card: value ± u, unit, method, assumptions, % error, reference + source
  - _Requirements: 4.1, 4.3_
- [x] 4.2 `UncertaintyBudget` stacked bar, largest term first, plain-language dominant-term line
  - _Requirements: 4.2, 5.3_
- [x]* 4.3 Property test: budget shares sum to 1 (P-LAB-2)
  - _Requirements: 4.2_
- [x] 4.4 `oracle/judge.ts` (z tiers, confidence downgrades, ranked causes with fixes, spooky + plain copy)
  - _Requirements: 5.1, 5.2, 5.4, 5.5_
- [x] 4.5 Oracle unit tests per tier and the cursed-trace fixture test
  - _Requirements: 5.1, 5.2, 5.4_
- [x]* 4.6 Property tests: jitter never raises confidence (P-LAB-3); larger error never improves tier (P-LAB-4)
  - _Requirements: 5.2_
- [x] 4.7 `OraclePanel` with avatar reaction (reduced-motion aware)
  - _Requirements: 5.5, 8.4_

- [x] 5. Experiments (each also has its own spec under `.kiro/specs/experiments/`)
- [x] 5.1 `pendulum-g` written by hand as the reference pattern (theory, analysis, uncertainty, notebook, card, property tests)
  - _Requirements: 4.1, 4.2_
- [x] 5.2 `free-fall` scaffolded by hook H1 from its spec, then completed and validated
  - _Requirements: 1.1, 4.1_
- [x] 5.3 `singing-ruler` (laptop mic banshee, predicted-frequency helper, spectrum pipeline)
  - _Requirements: 4.1, 4.2_

- [ ] 6. Replay mode
- [ ] 6.1 `scripts/sync-traces.ts` prebuild: validate + copy traces listed in `fixtures/traces/bundled.json`; fail build on error
  - _Requirements: 6.1_
- [ ] 6.2 Replay route (`?replay=<traceId>`) using the replay transport through the same runner; Revenant avatar + recorded label
  - _Requirements: 6.2, 6.3_
- [ ] 6.3 `ReplayControls` (play/pause, 1×/4×, skip to result) and "What if?" input edits
  - _Requirements: 6.4, 6.5_
- [ ]* 6.4 Property test: replay ≡ direct `analyze()` (P-LAB-5)
  - _Requirements: 6.5_
- [ ] 6.5 Curate ≥ 6 bundled traces (2 per experiment, ≥ 2 phones, 1 cursed)
  - _Requirements: 6.1, 6.6_

- [ ] 7. Export
- [ ] 7.1 Raw CSV and results CSV with SI units in headers
  - _Requirements: 7.1, 7.2_
- [ ] 7.2 `.seance` download + dev-only "Save to fixtures" middleware
  - _Requirements: 7.3, 7.4_
- [ ]* 7.3 Property test: `.seance` round-trip (P-LAB-6)
  - _Requirements: 7.3_

- [ ] 8. Accessibility and judge path
- [ ] 8.1 Keyboard paths, visible focus, text equivalents for charts
  - _Requirements: 8.2, 8.3_
- [ ] 8.2 Playwright E2E: landing → "No phone?" → Lab → replay pendulum → verdict < 60 s; possession Lab door → runner (deferred to K6)
  - _Requirements: 6.6, 9.1_

- [ ] 9. Validation
- [ ] 9.1 Fill `docs/lab-validation.md` gate table (each experiment on 2+ devices) (scheduled for K2/K3)
  - _Requirements: 4.1, 5.1_
- [ ] 9.2 Run H2 over bundled traces with `expected`; ≥ 3 generated tests green in CI (scheduled for K3)
  - _Requirements: 6.1_
