# Requirements Document — Poltergeist Lab

## Introduction

Poltergeist Lab (`apps/poltergeist-lab`) is App 1 of the Séance skeleton: guided physics and engineering experiments that use a phone's sensors (and the laptop microphone) as laboratory instruments. Every result carries units, an uncertainty, the method and assumptions, and a verdict from the Physics Oracle. Every experiment also works in replay mode from bundled ghost traces, so a judge with only a laptop can try everything.

Experiments are plugins built with `defineExperiment()` from `seance-core` and live in `apps/poltergeist-lab/src/experiments/<experiment-id>/`. Each has its own spec in `.kiro/specs/experiments/<experiment-id>/requirements.md`. This spec covers the shared Lab shell: library, runner, inputs, charts, Oracle, replay, export and safety.

## Requirements

### Requirement 1 — Experiment library and registration

**User Story:** As a student, I want to see the available experiments with what each needs, so that I can pick one I can do right now.

#### Acceptance Criteria

1. THE SYSTEM SHALL discover experiments automatically from `src/experiments/*/index.ts` without manual registration.
2. THE SYSTEM SHALL show, for each experiment, its spooky title, plain title, required spirits, estimated time, and whether a live spirit of the required kind is connected.
3. WHEN no required spirit is connected, THE SYSTEM SHALL still offer "Replay a recorded run" for that experiment.
4. IF an experiment module fails to load or validate, THEN THE SYSTEM SHALL hide that card, log the reason in dev mode, and keep the other experiments working.

### Requirement 2 — Guided run

**User Story:** As a student, I want step-by-step guidance with readiness checks, so that I record good data the first time.

#### Acceptance Criteria

1. THE SYSTEM SHALL run every experiment through the states SETUP → READY_CHECK → RECORDING → ANALYZING → RESULT, with ERROR reachable from any state.
2. WHEN an experiment enters SETUP, THE SYSTEM SHALL show its safety notices before the Start button becomes active.
3. WHILE in READY_CHECK, THE SYSTEM SHALL evaluate the experiment's readiness checks continuously and enable Start only when all pass.
4. WHILE RECORDING, THE SYSTEM SHALL show the live channels on a chart, the spirit avatar with its mood, and the current step instruction.
5. WHEN the experiment's stop condition is met or the user presses Stop, THE SYSTEM SHALL save the recording as a `GhostTrace` and run the experiment's `analyze()`.
6. IF analysis throws, THEN THE SYSTEM SHALL show a plain-language error, keep the trace, and offer "Try again" and "Download trace".

### Requirement 3 — Inputs with units and uncertainty

**User Story:** As a student, I want to enter measurements in the units I used, so that I don't make conversion mistakes.

#### Acceptance Criteria

1. THE SYSTEM SHALL require a unit and an uncertainty for every numeric input, with sensible defaults per input.
2. WHEN the user enters a length in mm or cm, THE SYSTEM SHALL convert it to metres for analysis and display both.
   **Property:** converting any length from mm or cm to m and back returns the original value within 1e-9 relative error.
3. IF an input is outside its declared valid range, THEN THE SYSTEM SHALL block Start and explain the valid range.

### Requirement 4 — Results with uncertainty

**User Story:** As a student, I want every result as value ± uncertainty with units and method, so that I can write a proper lab report.

#### Acceptance Criteria

1. THE SYSTEM SHALL display each primary result as value ± uncertainty with its unit, the method used for the uncertainty, and the list of assumptions.
2. THE SYSTEM SHALL display an uncertainty budget listing each contributing term and its share of the combined variance, largest first.
   **Property:** the shares of all budget terms sum to 1 ± 1e-9.
3. WHEN a reference value exists, THE SYSTEM SHALL display the percent error and the reference with its source.

### Requirement 5 — Physics Oracle

**User Story:** As a student, I want a clear verdict on whether my result agrees with theory and why not, so that I learn from bad runs instead of being confused by them.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute z = |x − ref| / √(u_x² + u_ref²) and assign the tier `approves` (z ≤ 1), `veil` (1 < z ≤ 2), `disagree` (2 < z ≤ 3) or `cursed` (z > 3).
2. IF confidence is low (any major diagnostic, jitter > 30%, or dropouts > 2% in the analysed window), THEN THE SYSTEM SHALL assign `cursed` regardless of z.
   **Property:** increasing jitter while all other inputs are fixed never increases confidence.
   **Property:** increasing |x − ref| while all other inputs are fixed never moves the tier towards `approves`.
3. THE SYSTEM SHALL show the dominant uncertainty term in plain language on every verdict.
4. WHEN the tier is `disagree` or `cursed`, THE SYSTEM SHALL list the most likely causes, each with a fix, ranked by severity.
5. THE SYSTEM SHALL show every verdict as a spooky line plus a plain-language line.

### Requirement 6 — Replay mode

**User Story:** As a judge with only a laptop, I want to run every experiment from a real recording, so that I can evaluate the Lab without a phone.

#### Acceptance Criteria

1. THE SYSTEM SHALL ship the traces listed in `fixtures/traces/bundled.json` as static assets and SHALL fail the build if any listed trace is missing or invalid.
2. WHEN the user chooses "Replay a recorded run", THE SYSTEM SHALL play the trace through the replay transport and the same runner, chart, analysis and Oracle used for live runs.
3. WHILE replaying, THE SYSTEM SHALL label the run as recorded (date and device) and render the spirit as a Revenant.
4. THE SYSTEM SHALL offer Play/Pause, 1× and 4× speed, and Skip to result during replay.
5. WHEN the user edits an input during replay, THE SYSTEM SHALL re-run analysis on the same trace and label the result "What if?".
   **Property:** replaying a trace and analysing it directly with `analyze()` give identical results.
6. THE SYSTEM SHALL let a user reach an Oracle verdict for any experiment from the landing page in under 60 s without a phone.

### Requirement 7 — Export

**User Story:** As a student, I want my data and results in files, so that I can analyse further and submit a report.

#### Acceptance Criteria

1. THE SYSTEM SHALL export raw channels as CSV with a header row naming each column and its SI unit (e.g. `t_ms`, `gyro_x_rad_per_s`).
2. THE SYSTEM SHALL export a results CSV containing quantity, value, uncertainty, unit, method, percent error and the Oracle verdict.
3. THE SYSTEM SHALL let the user download the run as a `.seance` trace.
   **Property:** exporting a trace to `.seance` and reading it back yields an equal trace.
4. WHERE the app runs on the dev server, THE SYSTEM SHALL offer "Save to fixtures" which writes the trace to `fixtures/traces/`.

### Requirement 8 — Safety and accessibility

**User Story:** As a student and as an instructor, I want safe instructions and an accessible interface, so that nobody gets hurt and everybody can use it.

#### Acceptance Criteria

1. THE SYSTEM SHALL show each experiment's safety notices before recording and in its notebook template.
2. THE SYSTEM SHALL make every control reachable by keyboard with visible focus.
3. THE SYSTEM SHALL provide text equivalents for charts (latest values with units) for screen-reader users.
4. WHILE reduced motion is active, THE SYSTEM SHALL use the 2D avatars and disable chart animations.

### Requirement 9 — Judge path integrity

**User Story:** As the builder, I want the judge path protected, so that new work never breaks the first experience.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep the route from the possession view's Lab door to a running experiment working at all times; an end-to-end test SHALL cover it.
2. THE SYSTEM SHALL keep the calibration (reference pose and gyro bias) from the possession view available to experiments.
