---
inclusion: fileMatch
fileMatchPattern: ["apps/poltergeist-lab/src/experiments/**", "packages/seance-core/src/signal/**", "packages/seance-core/src/plugins/**", ".kiro/specs/experiments/**"]
---
# Physics rules

## Units
- Every physical value is a `Quantity<U>` from `seance-core` (`q(value, 'm')`). Never pass raw numbers for physical quantities across function boundaries. Dimensionless values use unit `'1'`.
- Convert at the edges only: degrees → radians and deg/s → rad/s in the transport; cm/mm → m in `InputsForm`. Inside theory and analysis everything is SI (GPa only for display).
- Name variables with their meaning, not single letters, except in formulas that mirror a cited equation (then comment the equation).

## Results
- Every result is `Measured`: `{ value, uncertainty, unit, method, assumptions[] }`. `method` says how the uncertainty was obtained (e.g. "regression standard error", "quadrature of budget terms").
- Every experiment's `analyze()` returns `{ result, diagnostics, budget, stats }` and is **pure**: same trace + inputs → same output. No `Date.now()`, no randomness, no DOM.
- Uncertainty budgets list each term with its relative uncertainty, sensitivity exponent and share of the variance (shares sum to 1).
- Systematic effects are listed as assumptions with their estimated size and the direction of the bias.

## Theory files
- `theory.ts` holds pure forward and inverse models with doc comments giving: the formula, its source (textbook/handbook), and its validity range (e.g. "small-angle pendulum, θ₀ ≲ 20° with the series correction"; "Euler–Bernoulli cantilever first mode, β₁L = 1.8751, thin rectangular beam").
- Every inverse model has a property-based test: generate inputs → forward model → inverse recovers the inputs (within a stated tolerance).
- Every uncertainty function has a monotonicity property test (more input uncertainty never gives less output uncertainty).

## Signal processing
- Resample motion data to a uniform rate before filtering or FFT; report the measured jitter.
- Exception: edge timing (free fall) uses raw samples with linear interpolation, because resampling smears edges.
- Prefer gyroscope zero-crossings with interpolation and a linear fit of crossing times for periods.
- For audio, disable echo cancellation, noise suppression and AGC; subtract the room-noise spectrum; refine peaks with parabolic interpolation; check for mains hum (50/60 Hz and harmonics).

## Data quality
- Emit `Diagnostic` codes (`health.*`, `<experiment>.*`, `audio.*`) instead of throwing for bad data. The Physics Oracle owns the wording.
- Jitter > 30%, dropouts > 2% in the analysed window, or any major diagnostic means low confidence — never present such a result as agreeing with theory.

## References used in the Lab
- Standard gravity 9.80665 m/s² (display 9.81); local g via the international gravity formula only if the user enters latitude/altitude.
- Material properties: typical handbook values with ranges; cite the source in the notebook.

## Tests
- Property tests use fast-check with fixed seeds in CI; failing seeds get pasted into the test as regression cases.
- Replay tests generated from `fixtures/traces/*.seance` (hook H2) must not be edited by hand except to fix the import path; regenerate instead.
