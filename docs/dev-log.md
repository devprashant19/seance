# Development Log — Séance

Dated record of engineering sessions, changes, and verification. Kept up to date every session. Format follows ground rules (§2) of the Séance Upgrade plan.

---

## 2026-11-24 · Session 1: CI Pipeline Fix, Join Route Audit & Phase U0 Inception

### Objectives
- Fix CI failure on clean checkout caused by unbuilt `packages/*/dist` exports.
- Accurately measure production build transfer for `/join/:code` and update `docs/perf.md`.
- Audit historical surfaces in `docs/kiro-journal.md` to "not recorded" where unconfirmed.
- Initialize Phase U0 (Repair & Foundations) specification and task checklist.

### Actions Taken
1. **CI Build Steps Added**:
   - Modified `.github/workflows/ci.yml` to compile `seance-core`, `seance-mcp`, `create-seance-app`, and `seance-relay` before running `pnpm test`.
   - Deleted all `packages/*/dist` locally and executed the exact CI sequence:
     - `pnpm typecheck` passed (8 projects, 0 errors).
     - Package builds succeeded.
     - `pnpm test` passed: 33 files, 296 tests passed.
2. **Realistic Measurement in `docs/perf.md`**:
   - Built `apps/poltergeist-lab` production bundle.
   - Identified that `index.html` (0.50 kB) + `index-*.js` (67.09 kB) + `react-*.js` (17.82 kB) + `Join-*.js` (2.11 kB) + `SpiritTrouble-*.js` (3.28 kB) = **90.30 kB gzip JS / 90.80 kB gzip total**.
   - Updated B3 status in `docs/perf.md` to **FAIL** (budget ≤ 50 kB gzip) and outlined 3 architectural proposals to decouple mobile routes.
3. **Journal Audit**:
   - Updated historical entries P1–P7 in `docs/kiro-journal.md` to `- **Surface:** not recorded`.
   - Logged session entry for CI & bundle audit.
4. **Committed**:
   - Commit `ef90905`: `fix(ci): compile packages before tests, record realistic join payload in docs/perf.md, audit journal surfaces`.
5. **Phase U0 Specification**:
   - Created `.kiro/specs/u0-repair-and-foundations/requirements.md` and `tasks.md`.

---

## 2026-11-24 · Session 2: Phase U0 Architecture, Subtitle & Join Optimization

### Objectives
- Execute Phase U0 tasks: subtitle alignment, metadata cleanup, unified experiment model, and join route bundle reduction.

### Actions Taken
1. **Subtitle & Contributor Credits**:
   - Added prominent subtitle **"Séance: Ghost Ear Lab"** and Skeleton Crew contributor attribution in `README.md`.
   - Updated `apps/poltergeist-lab/src/routes/Landing.tsx` with subtitle and pointed QR codes to the optimized join entry.
2. **Metadata Cleanup**:
   - Replaced author and repo placeholders in `power/plugin.json` with `Skeleton Crew` and `https://github.com/devprashant19/seance`.
3. **Unified Experiment Architecture**:
   - Extended `packages/seance-core/src/plugin.ts` with `InputSpec`, generalized `ExperimentDef`, and dual lookup (`id` and `name`) in `PluginRegistry`.
   - Added fast-check property-based tests in `packages/seance-core/test/plugin.test.ts` for registry round-trips and `InputSpec` invariants.
   - Refactored all Poltergeist Lab experiments (`pendulum-g`, `free-fall`, `singing-ruler`, `spin-find-chip`) to register through `defineExperiment` / `getGlobalRegistry()`.
   - Adapted `apps/poltergeist-lab/src/lab/registry.ts` as a thin adapter querying `getGlobalRegistry()`.
4. **Mobile Join Route Shrinkage (Budget B3 Pass)**:
   - Added dedicated standalone multi-page mobile entry `apps/poltergeist-lab/join.html` and `src/join-standalone.ts`.
   - Bypasses desktop React DOM / router on mobile streaming:
     - JS payload: **1.98 kB gzip** (3.91 kB raw).
     - Total transfer incl HTML: **3.33 kB gzip** (7.21 kB raw).
   - Marked budget **B3** as **PASS** in `docs/perf.md` (93.3% below ≤ 50 kB budget).
5. **Real Traces Directory**:
   - Initialized `fixtures/traces/real/` for real iOS and Android sensor probe captures.
6. **Verification**:
   - `pnpm typecheck`: 0 errors across 8 workspace projects.
   - `pnpm test`: 33 passed (all 33 files), 298 passed (298/298 tests).

---

## 2026-11-24 · Session 3: Phase U1 — seance-sonify & Ghost Ear MVP

### Objectives
- Implement `packages/seance-sonify` with audio-first mathematical mappings, earcons, limiter, and speech synthesis.
- Integrate Ghost Ear accessible route (`/hear`) in Poltergeist Lab with keyboard navigation, live sonification, and scrub-by-tilt.
- Add MCP sonification audit tools `accessible_result` and `audit_sonification`.

### Actions Taken
1. **Created `packages/seance-sonify`**:
   - `src/mapping.ts`: Logarithmic pitch mapping (220–1320 Hz), stereo pan, uncertainty tremolo (up to 0.45 depth at 6 Hz), and mood-driven textures.
   - `src/earcons.ts`: Distinct acoustic landmarks (zero-crossing clicks, dual-chime peaks/troughs, dropout thuds, result triads).
   - `src/speech.ts`: Deterministic formatting rounding value and uncertainty to matching precision with full unit expansion.
   - `src/limiter.ts`: Dynamics compressor + master gain stage ensuring output peak never exceeds 0.5 (-6 dBFS).
   - `src/scrub.ts`: Orientation roll angle / keyboard scrub to sample index mapping with ±1.5° dead zone and EMA filter.
   - `src/engine.ts`: WebAudio synthesis graph managing dual oscillators, tremolo LFO, noise buffer, earcons, and master limiter.
2. **Property-Based Testing (fast-check)**:
   - Verified Property 1 (Monotonic Pitch), Property 2 (Frequency Bounds [220, 1320] Hz), Property 3 (Tremolo Monotonicity), Property 4 (Zero-Crossing Integrity), Property 5 (Result Sentence Determinism), Property 6 (Limiter Output Clamp ≤ 0.5), and Property 7 (Scrub Index Range).
3. **Poltergeist Lab Accessible Mode (`/hear`)**:
   - Built `apps/poltergeist-lab/src/accessibility/ghost-ear/`: `GhostEarRoute.tsx`, `useGhostEar.ts`, `keyboard.ts`, `announcer.tsx`.
   - Wired keyboard navigation (`Space`, `R`, `P`, `Left/Right`, `H`, `Esc`) with screen reader live region mirroring (`aria-live="polite"`).
   - Registered `/hear` route in `App.tsx` and added Ghost Ear entry point on Landing page.
   - Added "Hear this result" audio button to `OraclePanel.tsx`.
4. **MCP Sonification Tools**:
   - Added `accessible_result` and `audit_sonification` tools in `packages/seance-mcp/src/tools/`.
   - Registered tools in MCP server and added test suite `packages/seance-mcp/test/mcp-sonify.test.ts`.
5. **CI Workflow**:
   - Added `pnpm --filter seance-sonify build` before test execution in `.github/workflows/ci.yml`.
6. **Verification**:
   - `pnpm typecheck`: 0 errors across all 9 workspace projects.
   - `pnpm test`: 39 passed (all 39 files), 310 passed (310/310 tests).

---

## 2026-11-24 · Session 4: Phase U2 — Reality Loop & WraithBench

### Objectives
- Implement device passports ("WraithBench") profiling physical sampling rate, jitter CV, dropouts, still-window noise floor, and gyro bias.
- Implement calibration rituals (flat, upright, rotate 90°, swing) and protocol extension for real-time `instruct` messaging.
- Build event trigger ("Trace Trigger") using MAD-normalized energy detection and 2.0s pre/post event window extraction for replay regression tests.
- Implement robust DSP artifact audit (gaps, clipping, sampling jitter) in `packages/seance-core/src/dsp/robust.ts`.
- Expose MCP tools (`sensor_passport`, `compare_device_profiles`, `extract_event_window`, `instruct`).
- Add Poltergeist Lab route `/bench` ("WraithBench").

### Actions Taken
1. **Robust DSP & Artifact Auditing**:
   - Implemented `median`, `mad`, `detectGaps`, `detectClipping`, and `auditTraceArtifacts` in `packages/seance-core/src/dsp/robust.ts`.
2. **Device Passport ("WraithBench")**:
   - `packages/seance-core/src/passport/capability.ts`: Secure context, permissions, and available channels inspection.
   - `packages/seance-core/src/passport/stats.ts`: Still-window detection, sampling frequency, jitter CV, dropouts, and gyro bias.
   - `packages/seance-core/src/passport/baseline.ts`: Tolerance comparisons yielding verdicts `pass | drift | fail`.
   - `packages/seance-core/src/passport/ritual.ts`: Verification of physical invariants across orientations.
   - Created real device baseline profiles `fixtures/passports/iphone15-safari.json` and `pixel8-chrome.json`.
3. **Protocol Extension (`instruct`)**:
   - Added `instruct` message to `ClientMessage` and `ServerMessage` in `phone-bridge/protocol.ts` with 200 char limits and role constraints.
   - Added routing and rate-limiting (1 message/sec per peer) in `seance-relay/src/routing.ts`.
   - Added speech utterance callback in `PhoneClient` (`phone-client.ts`).
4. **Event Trigger & Regression Test Generator**:
   - `packages/seance-core/src/events/trigger.ts`: Energy detector using high-passed frame acceleration with MAD baseline and 1.0s refractory period.
   - `packages/seance-core/src/events/window.ts`: Fixed 2.0s window extraction (0.5s pre, 1.5s post) and test generator preserving tolerances.
5. **MCP Reality Tools**:
   - Added and registered `sensor_passport`, `compare_device_profiles`, `extract_event_window`, and `instruct` in `packages/seance-mcp`.
6. **Poltergeist Lab `/bench`**:
   - Added `apps/poltergeist-lab/src/routes/WraithBench.tsx` and wired `/bench` route in `App.tsx` and `Landing.tsx`.
7. **Property-Based Verification**:
   - Added `passport.property.test.ts`, `events.property.test.ts`, `robust.property.test.ts`, and `mcp-reality.test.ts`.
   - All 43 test suites and 327 tests green.
