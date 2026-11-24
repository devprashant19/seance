# Tasks — Phase U0: Repair and Foundations

- [x] **Task 0.1: CI green on clean checkout**
  - Added build step before `pnpm test` in `.github/workflows/ci.yml`.
  - Proven locally by removing all `packages/*/dist` and running full CI command sequence.

- [x] **Task 0.3a: Truthful docs & surface audit**
  - Updated `docs/perf.md` with measured `/join/:code` payload and reduction proposals.
  - Set unconfirmed surfaces in `docs/kiro-journal.md` to "not recorded".

- [x] **Task 0.7: Initialize `docs/dev-log.md`**
  - Created persistent session log tracking sessions, objectives, actions, and verification.

- [x] **Task 0.9: Subtitle "Séance: Ghost Ear Lab"**
  - Updated `README.md` title & header.
  - Updated `apps/poltergeist-lab/src/routes/Landing.tsx` title & header.
  - Added Skeleton Crew contributor attribution to `README.md`.

- [x] **Task 0.4: Clean up `power/plugin.json` metadata**
  - Replaced `REPLACE_WITH_…` placeholders with project repo and author details.

- [x] **Task 0.2: Unified experiment architecture**
  - Extended `packages/seance-core/src/plugin.ts` to include `InputSpec`, generalized `ExperimentDef`, and dual lookup (`id` and `name`).
  - Added property-based tests in `packages/seance-core/test/plugin.test.ts` (Property 1: Registry Roundtrip, Property 2: Input Range Invariant).
  - Refactored `apps/poltergeist-lab/src/lab/registry.ts` and `experiments/*` to register through `defineExperiment` / `getGlobalRegistry()`.
  - Re-verified all unit and property tests (298 passed).

- [x] **Task 0.7b: Shrink `/join/:code` bundle size to meet B3 budget (≤ 50 kB gzip)**
  - Implemented standalone mobile streaming client `apps/poltergeist-lab/join.html` and `src/join-standalone.ts`.
  - Payload measured at **1.98 kB gzip JS (3.33 kB gzip total)** — achieving **PASS** on Budget B3.
  - Updated `docs/perf.md`.

- [ ] **Task 0.5 & 0.6: Real sensor data and bundled traces**
  - Requires recording on physical iOS & Android devices using `tools/sensor-probe` (Protocol provided to user).
  - Ingest real traces into `fixtures/traces/real/` and recompute `docs/sensor-reality.md`.

- [ ] **Task 0.8: Deploy configuration & smoke test verification**
  - Requires deploying relay & apps to hosting provider and running smoke tests from real mobile data.
