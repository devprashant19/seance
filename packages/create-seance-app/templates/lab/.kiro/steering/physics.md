---
inclusion: fileMatch
fileMatchPattern: ["src/experiments/**"]
---
# Physics rules

## Units
- Every physical value is a `Quantity<U>` from `seance-core` (`q(value, 'm')`). Never pass raw numbers for physical quantities across function boundaries. Dimensionless values use unit `'1'`.
- Convert at the edges only: degrees to radians and deg/s to rad/s in the transport; cm/mm to m in `InputsForm`. Inside theory and analysis everything is SI (GPa only for display).
- Name variables with their meaning, not single letters, except in formulas that mirror a cited equation (then comment the equation).

## Results
- Every result is `Measured`: `{ value, uncertainty, unit, method, assumptions[] }`. `method` says how the uncertainty was obtained (e.g. "regression standard error", "quadrature of budget terms").
- Every experiment's `analyze()` returns `{ result, diagnostics, budget, stats }` and is **pure**: same trace + inputs to same output. No `Date.now()`, no randomness, no DOM.
- Uncertainty budgets list each term with its relative uncertainty, sensitivity exponent and share of the variance (shares sum to 1).

## Theory files
- `theory.ts` holds pure forward and inverse models with doc comments giving: the formula, its source (textbook/handbook), and its validity range.
- Every inverse model has a property-based test: generate inputs to forward model to inverse recovers the inputs (within a stated tolerance).
- Every uncertainty function has a monotonicity property test (more input uncertainty never gives less output uncertainty).

## Signal processing
- Resample motion data to a uniform rate before filtering or FFT; report the measured jitter.
- Prefer gyroscope zero-crossings with interpolation and a linear fit of crossing times for periods.

## Data quality
- Emit `Diagnostic` codes instead of throwing for bad data. The Physics Oracle owns the wording.
- Jitter > 30%, dropouts > 2% in the analysed window, or any major diagnostic means low confidence.

## Tests
- Property tests use fast-check with fixed seeds in CI; failing seeds get pasted into the test as regression cases.
