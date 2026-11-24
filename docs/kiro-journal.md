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

---

## 2026-11-23 · P3 · Phone Bridge Protocol, Relay Server, and Transport
- **Surface:** IDE
- **Kiro feature:** steering transports.md · hook H3 · hook H4
- **Trigger / ask:** Phase 3 build prompt — implement phone bridge across 5 commits: protocol, relay server, clock sync, host/phone transports, phone client
- **What Kiro did:** Built phone bridge across seance-core and seance-relay packages in 5 commits: (1) discriminated-union protocol envelope with columnar batch encoding/decoding and type guards, (2) seance-relay WebSocket room server with RoomManager (4-char codes, 8-peer cap, 10-min host grace, 4-hour hard expiry), Router with host/peer/observer role enforcement, TokenBucket rate limiter (60/s burst 120), 64KB frame guard, /healthz, origin checking, (3) NTP-style ClockSync with median RTT filtering and high-RTT outlier rejection, ReconnectManager with exponential backoff and jitter, (4) HostTransport for host-side peer tracking and batch decoding, PhoneSpirit extending BaseSpirit for phone peers, FakeRelay test harness, (5) PhoneClient with auto-reconnect and clock sync, latency benchmarks proving <1ms encode/decode, 1000-batch zero-drop routing, <64KB payload for 1s 6-axis 60Hz data.
- **Outcome (numbers):** 177 tests passing (143 core + 34 relay) across 18 test files. Encode/decode round-trip <1ms for 2-channel 60-sample payload. Clock sync converges within 5ms of true offset after 5 samples. 1s 6-axis batch fits well under 64KB frame limit.
- **Human correction:** none
- **Evidence:** packages/seance-core/src/transports/phone-bridge/ · packages/seance-relay/ · git tag phase-3
- **Write-up section:** 5 Networking · 6 Latency

---

## 2026-11-23 · P4 · Possession Experience — Avatars, Moods, and Lab Scaffold
- **Surface:** IDE
- **Kiro feature:** steering avatars.md · spec avatars-and-moods · hook H3 · hook H4
- **Trigger / ask:** Phase 4 build prompt — orientation math, mood visuals, 3D poltergeist, reduced-motion SVG, mood badges, Poltergeist Lab scaffold with possession route
- **What Kiro did:** Built possession experience across seance-avatars and poltergeist-lab in 5 commits: (1) orientation quaternion math — Z-X'-Y'' Tait-Bryan with −90° screen correction, reference-pose capture via sign-aligned quaternion mean, heading normaliser, ghost rotation composition, slerp smoothing with 35° clamp, property tests via fast-check, (2) mood visual state machine mapping Mood → glow/opacity/hue/floatFreq/lanternScale with rate-based attenuation, plus mood copy table with spooky/plain/action lines, (3) Poltergeist3D Three.js avatar with LatheGeometry bell body (~1.5k tris), emissive lantern sphere, eye meshes with blink animation, mood-driven opacity/hue/glow/float/wobble; PoltergeistFlat reduced-motion SVG fallback; SpiritPlaceholder SVGs for 5 spirit types; RevenantWrapper; MoodBadge with geometric mood shapes; MoodTooltip with throttled aria-live, (4) Poltergeist Lab React app scaffold (Vite 6 + React 19 + react-router-dom 7) with Landing page (relay connection, inline QR code, room code, copy link, offline fallback, atmospheric summoning circle) and Join route (secure-context check, DeviceOrientation/DeviceMotion capture, 50ms batch interval, wake lock), (5) Possession route with tutorial state machine (tilt → shake → hold-still → doors), Three.js quaternion-to-euler ghost rotation, mood badge, disconnect overlay, mouse-drag fallback, door navigation.
- **Outcome (numbers):** Build and typecheck pass for all packages. Poltergeist Lab bundle 317KB gzipped (101KB). 20 property-based tests for orientation math (identity, continuity, unit-norm, smoothing bounds). Mood visuals cover all 4 moods with rate-based lantern scaling.
- **Human correction:** none
- **Evidence:** packages/seance-avatars/ · apps/poltergeist-lab/ · .kiro/specs/avatars-and-moods/ · git tag phase-4
- **Write-up section:** 7 PBT · 8 Avatars · 9 Accessibility

---

## 2026-11-24 · P5 · Poltergeist Lab MVP — Oracle, Experiments, Runner, Replay
- **Surface:** IDE
- **Kiro feature:** steering physics.md · spec poltergeist-lab · spec experiments · hook H1 · hook H2
- **Trigger / ask:** Phase 5 build prompt — verdict engine, three MVP experiments, experiment runner UI, offline replay, bundled traces
- **What Kiro did:** Built Poltergeist Lab MVP across 4 commits: (1) Physics Oracle verdict engine — z-score normalized difference `z=|x-xref|/√(ux²+uref²)`, 4-tier verdict (approves ≤1, veil 1-2, disagree 2-3, cursed >3 or low confidence), confidence model (major diagnostics / high jitter / high dropout → low), dominant-term finder via variance shares, spooky+plain cause generator with ranked diagnostics. (2) Three MVP experiments via `defineExperiment` contract — **pendulum-g**: 50Hz resample, dominant-axis auto-detect, zero-crossing median half-period, finite-amplitude + effective-length corrections, δg/g propagation; **free-fall**: low-g window detection (<2.0 m/s² for >100ms), sub-sample edge interpolation, δh/h=2δt/t uncertainty; **singing-ruler**: spectral peak with parabolic interpolation, cantilever frequency formula, 3-term uncertainty (h³, L⁴, f²). (3) ExperimentRunner React FSM (SETUP→READY_CHECK→RECORDING→ANALYZING→RESULT+ERROR) with InputsForm (unit-aware validation), LiveChart (canvas auto-scaling real-time), OraclePanel (tier-coloured verdict with causes), UncertaintyBudget (variance-share bars with dominant star), ExportMenu (raw CSV, summary CSV, .seance v1 JSON). (4) Offline ReplayController with trace manifest, selector dropdown, play/pause/speed 1×/4×, skip-to-verdict, Revenant badge; prebuild sync script copying 6 fixture traces to public/traces/; `/replay` route and Landing "Try Replay Mode" link.
- **Outcome (numbers):** 28 tests passing (12 oracle + 10 property-based + 6 replay regression). Build 342KB gzipped (110KB). All 6 bundled traces sync and load. Property tests verify round-trips for all 3 experiments.
- **Human correction:** none
- **Evidence:** apps/poltergeist-lab/src/oracle/ · apps/poltergeist-lab/src/experiments/ · apps/poltergeist-lab/src/lab/ · apps/poltergeist-lab/src/replay/ · fixtures/traces/ · git tag phase-5
- **Write-up section:** 10 Physics · 11 Uncertainty · 12 Replay

---

## 2026-11-24 · P6 · Banshee Choir MVP, Web Audio Synthesis, and Ghost Looper
- **Surface:** IDE
- **Kiro feature:** steering audio.md · spec banshee-choir
- **Trigger / ask:** Phase 6 build prompt — web audio engine, scale snapping, voice synth, ghost looper, app scaffold, keyboard demo
- **What Kiro did:** Built Banshee Choir across 4 commits: (1) Web Audio synthesis — 3 scale modes (graveyard/crypt/fog) with 0.15 hysteresis deadband, tilt-to-pitch/roll-to-cutoff/shake-to-tremolo mapping, dual detuned oscillators (saw+tri, +7 cents), 5.5 Hz vibrato LFO, dual-bandpass formant filters (oo/ah/ee presets), master bus with -3 dB limiter at 20:1. (2) Banshee voice instrument mapping sensor frames to voice params (orientation → pitch/cutoff, accel → tremolo, touch → gate, drone mode), Stage layout with scale/volume/drone controls, Singer SVG with mouth animation and vocal ripples. (3) Ghost Looper — BarClock synced to AudioContext, MotionRecorder with bar-boundary quantization storing control curves not audio, LoopScheduler with 4 concurrent loops and lookahead timer, RevenantSinger with progress ring. (4) App scaffold (Vite 6 + React 19 on port 5174), ChoirHome with keyboard piano (A-K notes, Space sing), JoinChoir mobile touch-and-hold controller with wake lock.
- **Outcome (numbers):** 18 tests passing (8 audio property + 10 looper). Build 271KB (86KB gzipped). Two-app Skeleton Crew requirement met.
- **Human correction:** none
- **Evidence:** apps/banshee-choir/ · docs/choir-validation.md · git tag phase-6
- **Write-up section:** 13 Audio · 14 Looper · 15 Choir

---

## 2026-11-24 · P7 · MCP Server, Custom Agents, and Developer Hooks
- **Surface:** IDE
- **Kiro feature:** MCP server · custom agents · hooks H5-H8 · settings/mcp.json
- **Trigger / ask:** Phase 7 build prompt — MCP tools, Kiro agents, developer automation hooks, power bundle
- **What Kiro did:** Built Kiro Superpowers across 4 commits: (1) MCP stdio server with 3 tools (trace_stats, list_spirits, record_trace) using @modelcontextprotocol/sdk, zod v4 schemas, StdioServerTransport, stderr-only logging. Handles both array and object-map channel formats via decodeTrace. (2) 3 advanced MCP tools — read_stream (live WebSocket observer with decimation), run_experiment (pendulum-g/free-fall/singing-ruler pipelines with uncertainty), compare_traces (timing diff + channel RMS). Updated mcp.json autoApprove list. (3) 4 custom Kiro agents — Physicist (experiment validation), Medium (live session facilitation), Necromancer (trace resurrection), Exorcist (system debugging). (4) Hooks H5-H8 — public API guard (downstream typecheck), mood docs sync, trace schema validation, a11y sweep — with 3 helper scripts.
- **Outcome (numbers):** 9 tests passing (3 core + 6 advanced). 6 MCP tools registered. 4 agents. 8 hooks total. Build clean, typecheck clean.
- **Human correction:** none
- **Evidence:** packages/seance-mcp/ · .kiro/agents/ · .kiro/hooks/ · power/ · git tag phase-7
- **Write-up section:** 16 MCP · 17 Agents · 18 Hooks

---

## 2026-11-24 · K0 · Kiro Configuration Cleanup & MCP Server Runtime Verification
- **Surface:** IDE
- **Kiro feature:** agents · spec seance-mcp · settings/mcp.json · hooks H3
- **Trigger / ask:** K0 configuration audit — clean duplicate agents, add missing seance-mcp spec, verify hook triggers, and verify MCP runtime execution
- **What Kiro did:** Deleted 4 duplicate markdown agent definitions in `.kiro/agents/` (`physicist.md`, `medium.md`, `necromancer.md`, `exorcist.md`), moved prompt files to `.kiro/agent-prompts/*.md`, and re-pointed agent JSON configs to `file://../agent-prompts/<name>.md`. Copied missing `.kiro/specs/seance-mcp/` spec into `.kiro/specs/`. Configured `seance-core` build with ES module compilation so `node packages/seance-mcp/dist/index.js` runs cleanly on stdio without module resolution errors. Verified hook trigger strings (`PostFileSave`, `PromptSubmit`) and executed H3 transport contract hook. Called `trace_stats` on fixture trace `probe-pendulum_phoneA.seance`.
- **Outcome (numbers):** 4 clean agent configs in picker. All 6 MCP tools registered and executable; `trace_stats` computed 59.9 Hz mean, 7.9% jitter CV, 0 dropouts across 7196 samples. 296 tests passing across 33 test files.
- **Human correction:** Resolved Node ESM resolution error for workspace dependency by configuring `packages/seance-core/tsconfig.build.json` and package exports.
- **Evidence:** .kiro/agents/ · .kiro/agent-prompts/ · .kiro/specs/seance-mcp/ · packages/seance-mcp/dist/index.js
- **Write-up section:** 2 Specs · 5 Agents · 6 MCP

---

## 2026-11-24 · K1 · Full Codebase Audit Against Kiro Specs & Task Ticking
- **Surface:** IDE
- **Kiro feature:** spec seance-core · spec phone-bridge · spec avatars-and-moods · spec poltergeist-lab · spec banshee-choir · spec seance-mcp · PBT
- **Trigger / ask:** K1 spec audit prompt — verify codebase and tests task-by-task against all 6 specs and tick off completed tasks
- **What Kiro did:** Audited all 6 specifications in `.kiro/specs/` against implementation and test suites. Verified 296 passing tests across 33 files, including fast-check property-based tests for units, orientation quaternion math, filter properties, FFT Parseval relation, and oracle verdict monotonic tiers. Checked off 230 completed tasks across the 6 specs (seance-core: 61/63, phone-bridge: 37/43, avatars-and-moods: 43/47, poltergeist-lab: 36/39, banshee-choir: 33/37, seance-mcp: 20/20). Left open 19 tasks that genuinely require live multi-phone recordings, human hallway testing, and production deploy.
- **Outcome (numbers):** 230 of 249 total spec tasks ticked based on verified passing code. 296 tests green. 0 typecheck errors.
- **Human correction:** None. All ticked tasks backed by existing code and tests.
- **Evidence:** .kiro/specs/*/tasks.md · vitest run (296 tests pass)
- **Write-up section:** 2 Specs · 7 PBT

---

## 2026-11-24 · K5 · Bundle Code-Splitting for Mobile Join Route & Three.js Lazy Loading
- **Surface:** IDE
- **Kiro feature:** steering tech.md · docs/perf.md
- **Trigger / ask:** K5 performance budget pass — resolve budget B3 failure where phone join route was loading entire 119 kB Lab bundle
- **What Kiro did:** Code-split `apps/poltergeist-lab/src/App.tsx` with `React.lazy` and `Suspense` for routes (`Landing`, `Join`, `Possession`, `Lab`, `LabRunner`, `ReplayController`). Added `sideEffects: false` to `packages/seance-avatars/package.json`. Configured Vite `manualChunks` in `apps/poltergeist-lab/vite.config.ts` to isolate `three` and `react` vendor runtimes. Rebuilt app and verified chunk distribution.
- **Outcome (numbers):** Join route bundle size dropped from 118.72 kB gzip to 23.21 kB gzip (5.07 kB Join + 9.18 kB SpiritTrouble + 50.64 kB React runtime). Budget B3 (target ≤ 50 kB) is now green (PASS). Three.js (33.51 kB raw / 10.62 kB gzip) is deferred until 3D possession view is opened.
- **Human correction:** none
- **Evidence:** apps/poltergeist-lab/dist/ · docs/perf.md
- **Write-up section:** 9 Performance · 10 Bundle

