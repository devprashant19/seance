# Requirements Document — Phase U0: Repair and Foundations

## Introduction

Phase U0 establishes truthful, reliable, green, and consistent foundations for the Séance monorepo before any higher-level features (Ghost Ear, Reality Loop, Smoked Drum) are added.

Scope:
1. CI verification on clean checkout (reproducible build before test).
2. Unified Experiment Model: align Poltergeist Lab experiments with `packages/seance-core/src/plugin.ts` (`defineExperiment` / `getGlobalRegistry`).
3. Truthful Documentation: performance budgets, unverified surface records, and contributor credits.
4. Power plugin metadata cleanup: replace placeholder strings.
5. Real sensor traces capture and replay bundling.
6. Phone Join route bundle optimization (budget B3 ≤ 50 kB gzip).
7. Visible subtitle "Séance: Ghost Ear Lab" on README and Landing view.
8. Dated dev log tracking all engineering activities.

---

## Requirements

### Requirement 1 — Clean-Checkout Reproducible CI Build
**User Story:** As an open-source contributor or CI runner, I want `pnpm test` to succeed on a clean checkout without needing pre-existing `dist/` directories committed, so that builds are reproducible.

#### Acceptance Criteria
1. WHEN CI runs from a fresh clone, THE SYSTEM SHALL build all compiled dependency packages (`seance-core`, `seance-mcp`, `create-seance-app`, `seance-relay`) before running `pnpm test`.
2. WHEN `packages/*/dist` directories are deleted locally, THE SYSTEM SHALL succeed with exit code 0 across typecheck, compilation, and all 296 unit/property tests.

---

### Requirement 2 — Unified Experiment Architecture
**User Story:** As an experiment author, I want a single unified `defineExperiment` API across the core SDK and Poltergeist Lab, so that new physical experiments plug into the system without duplicating registry models.

#### Acceptance Criteria
1. THE SYSTEM SHALL define `InputSpec` and a generalized `ExperimentDef` in `packages/seance-core/src/plugin.ts` supporting experiment identifiers, physical channels, input parameters with uncertainties, safety notes, and analysis functions.
2. WHEN an experiment is defined using `defineExperiment(def)`, THE SYSTEM SHALL freeze the definition and register it into `PluginRegistry` / `getGlobalRegistry()`.
3. THE SYSTEM SHALL permit `apps/poltergeist-lab` to query experiments directly via `getGlobalRegistry()` or a typed adapter.
4. **Property (Registry Roundtrip):** For any experiment registered with `defineExperiment`, retrieving it by `id` or `name` from `getGlobalRegistry()` SHALL return an identical definition.
5. **Property (Input Range Invariant):** For every `InputSpec` in an experiment definition, `min <= defaultValue <= max` and `defaultUncertainty >= 0`.

---

### Requirement 3 — Truthful Documentation & Contributor Attribution
**User Story:** As a reviewer or user, I want documentation to reflect only verified measurements and confirmed tools, so that the project maintains strict scientific honesty.

#### Acceptance Criteria
1. THE SYSTEM SHALL record verified bundle sizes and realistic PASS/FAIL statuses in `docs/perf.md`.
2. THE SYSTEM SHALL record "not recorded" for historical surfaces where Kiro IDE interaction was unconfirmed in `docs/kiro-journal.md`.
3. THE SYSTEM SHALL credit project contributors and state licensing in `README.md`.
4. **Property (Claim Guard):** No user-facing string or documentation file SHALL contain unverified claims including "ghost detected", "fully accessible", medical diagnoses, or structural safety assertions.

---

### Requirement 4 — Power Plugin Metadata
**User Story:** As an agent extension user, I want `power/plugin.json` to have valid author and repository metadata rather than template placeholder tokens.

#### Acceptance Criteria
1. WHEN inspecting `power/plugin.json`, THE SYSTEM SHALL contain no instances of `REPLACE_WITH_`.

---

### Requirement 5 — Mobile Join Route Bundle Size Budget
**User Story:** As a student joining on a cellular network or older phone, I want the join page (`/join/:code`) to download under 50 kB gzip before the Begin tap, so that connection is instant.

#### Acceptance Criteria
1. WHEN building `apps/poltergeist-lab`, the initial transferred bundle for `/join/:code` prior to interaction SHALL NOT exceed 50.0 kB gzip.
2. **Property (Budget B3 Invariant):** Total downloaded JS + HTML on `/join/:code` <= 50.0 kB gzip.

---

### Requirement 6 — Visible Subtitle Branding
**User Story:** As a hackathon reviewer, I want to clearly distinguish this project as "Séance: Ghost Ear Lab" on the landing page and README.

#### Acceptance Criteria
1. THE SYSTEM SHALL display "Séance: Ghost Ear Lab" prominently on the root `README.md` and `apps/poltergeist-lab/src/routes/Landing.tsx`.

---

### Requirement 7 — Dated Development Log
**User Story:** As an auditor, I want a persistent dated log of every session's actual actions in `docs/dev-log.md`.

#### Acceptance Criteria
1. THE SYSTEM SHALL maintain `docs/dev-log.md` with session timestamps, tools used, changes made, and verification results.
