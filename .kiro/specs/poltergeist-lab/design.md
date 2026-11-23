# Design Document — Poltergeist Lab

## Overview

A Vite + React app that hosts experiment plugins. The shell (library, runner, inputs, chart, Oracle, replay, export) is generic; each experiment folder supplies its definition, pure theory, analysis, uncertainty budget, notebook template and card. Live and replayed runs share one code path: a `Spirit` (live via phone-bridge/local, or Revenant via the replay transport) feeds the runner; the runner records a `GhostTrace`; the experiment's pure `analyze()` produces an `ExperimentResult`; the Oracle judges it.

## Architecture

```
routes/
  Landing ─► Possession ─► Lab (library) ─► Run/:experimentId[?replay=<traceId>]
                                                │
lab/                                            ▼
  registry.ts  ── import.meta.glob('../experiments/*/index.ts') ──► Experiment[]
  ExperimentRunner.tsx  (state machine)  ──► uses steps/readiness from the Experiment
      │   live: Spirit from phone-bridge/local      replay: Spirit from replay transport (Revenant)
      ▼
  TraceRecorder (seance-core)  ──► GhostTrace ──► experiment.analyze(trace, inputs)   [PURE]
                                                         │ ExperimentResult + Diagnostic[] + BudgetTerm[]
                                                         ▼
  oracle/judge.ts  [PURE]  ──► Verdict ──► OraclePanel, UncertaintyBudget, ExportMenu
replay/
  manifest.ts (loads public/traces/bundled.json), ReplayControls.tsx
experiments/<id>/
  index.ts  theory.ts  analysis.ts  uncertainty.ts  notebook.md  Card.tsx  theory.property.test.ts
```

## Components and Interfaces

```ts
// Experiment module contract (index.ts default export)
export default defineExperiment({
  id: 'pendulum-g', title: 'Pendulum gravity', spookyTitle: 'The Swinging Spirit',
  spirits: ['poltergeist'], channels: ['gyro', 'accelG'],
  inputs: {
    d: { label: 'Pivot to phone centre', unit: 'm', accept: ['m', 'cm', 'mm'], default: 0.6, uncertainty: 0.005, range: [0.1, 2.0] },
    a: { label: 'Phone length (optional)', unit: 'm', optional: true, default: 0.15, uncertainty: 0.002 },
  },
  steps: [
    { id: 'hang', title: 'Hang the phone', instruction: '…', ready: ctx => ctx.gravityAlongString() },
    { id: 'swing', title: 'Swing gently', instruction: '…', stop: ctx => ctx.periodsDetected() >= 12 },
  ],
  analyze: (trace, inputs) => analysePendulum(trace, inputs),   // returns { result, diagnostics, budget }
  notebook: notebookTemplate, safety: ['Swing over a bed…', 'Check the knot…'],
});

// Shell types
type RunState = 'SETUP' | 'READY_CHECK' | 'RECORDING' | 'ANALYZING' | 'RESULT' | 'ERROR';
interface RunContext { spirit: Spirit; calibration?: Calibration; elapsedS: number; /* helpers per experiment */ }
interface BudgetTerm { name: string; relative: number; sensitivity: number; share: number }  // share of variance
interface AnalysisOutput { result: ExperimentResult; diagnostics: Diagnostic[]; budget: BudgetTerm[]; stats: TraceStats }

// Oracle (see phases/phase-05-poltergeist-lab-mvp/physics-oracle.md)
function judge(result: ExperimentResult, stats: TraceStats, diagnostics: Diagnostic[], budget: BudgetTerm[]): Verdict;
```

- `registry.ts` validates each module (id matches folder name, channels ⊆ known `ChannelId`s, inputs have units) and skips invalid ones with a dev warning.
- `InputsForm` converts accepted units to SI with `q()` and stores `{ value, uncertainty, unit }`.
- `LiveChart` wraps uPlot with a ring buffer per channel (last 10 s), updated at ≤ 30 Hz.
- `TraceRecorder` (from `seance-core`) records the experiment's channels + inputs + device + clock + calibration + health summary.
- `ExportMenu`: raw CSV, results CSV, `.seance` download, and in dev a POST to a Vite dev-server middleware that writes to `fixtures/traces/` ("Save to fixtures").

## Data Models

- `GhostTrace` v1 (conventions §7). Lab adds `experiment`, `inputs`, and on request `expected` (`quantity`, `value`, `unit`, `tolerance`) when the user marks a run as a reference run.
- `bundled.json` manifest (`version`, `traces[]` with `id`, `experiment`, `title`, `spookyTitle`, `device`, `role`, `blurb`).
- CSV raw: `t_ms,<channel>_<axis>_<unit>` columns; results CSV: `quantity,value,uncertainty,unit,method,percent_error,verdict_tier,verdict_plain`.

## Error Handling

| Failure | Behaviour |
|---|---|
| Spirit fades during RECORDING | pause the step, show the fading tooltip; resume when back; mark the gap in the trace (dropouts) |
| Analysis throws | ERROR state, plain message, keep trace, offer retry/download |
| Invalid input | Start disabled with range explanation |
| Bundled trace fetch fails | message + offer another bundled trace; never a blank runner |
| Mic permission denied (singing ruler) | explain, offer replay |

## Testing Strategy

- **Per experiment:** `theory.property.test.ts` (forward model → inverse recovers input; monotonic uncertainty), plus analysis tests on synthetic traces.
- **Oracle:** unit tests per tier; properties from Requirement 5.2; fixture test on the cursed trace.
- **Replay equivalence:** property — replay through the transport + runner equals direct `analyze()` (Requirement 6.5).
- **Trace round-trip:** property — export/import equality (Requirement 7.3).
- **H2-generated tests:** `test/traces/<trace-id>.replay.test.ts` for every trace with `expected`.
- **E2E (Playwright):** landing → "No phone?" → Lab → replay pendulum → verdict visible within 60 s; possession Lab door → runner opens.

## Correctness Properties

| ID | Property | Requirement |
|---|---|---|
| P-LAB-1 | mm/cm ↔ m round-trip | 3.2 |
| P-LAB-2 | budget shares sum to 1 | 4.2 |
| P-LAB-3 | more jitter never raises confidence | 5.2 |
| P-LAB-4 | larger error never moves tier towards approves | 5.2 |
| P-LAB-5 | replay ≡ direct analysis | 6.5 |
| P-LAB-6 | `.seance` export/import round-trip | 7.3 |
