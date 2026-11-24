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
