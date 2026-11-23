---
name: seance-experiments
description: Use when writing or reviewing a physics or engineering measurement built from sensor data (pendulum, free fall, friction, vibration, cantilever stiffness, damping, centripetal acceleration), when adding units or uncertainty to calculations, or when turning a recorded sensor trace into a regression test.
---

# Séance Experiments Skill

A Séance experiment turns a recorded or live sensor trace into a **trustworthy number**: a value with a unit, an uncertainty, a method and stated assumptions.

## Read first
- `references/physics-rules.md`: units, uncertainty, formula sources and validity ranges.
- `references/trace-format.md`: the `.seance` v1 trace format used for recording, replay and tests.

## The shape of every result
```ts
{ value: Quantity<U>, uncertainty: Quantity<U>, unit: U, method: string, assumptions: string[] }
```
A number without an uncertainty and a method is not a result.

## Building a new experiment
1. Write the requirements in EARS form ("WHEN … THE SYSTEM SHALL …"). Mark invariants with `**Property:**`.
2. Write a **pure forward model** (inputs → expected signal) and a **pure inverse** (signal → result).
3. Write property-based tests: forward model → add realistic noise and jitter → inverse recovers the input within the reported uncertainty. Also check that uncertainty never decreases when an input uncertainty increases.
4. Resample to a uniform grid before an FFT or period estimation, and report jitter.
5. Prefer gyroscope zero-crossings for periods. Use hysteresis so noise near zero doesn't double-count crossings.

## Debugging a wrong result (with the seance MCP server)
1. `trace_stats(trace)`: is the data bad (jitter, dropouts, clipping)?
2. `run_experiment(trace)` and `run_experiment(trace, { options: { skipResample: true } })`: does the pipeline or the data cause the error?
3. `compare_traces(bad, good)`: what differs between a bad and a good run?
4. Separate bad data, wrong model/assumption and code bug, and give the evidence for each.

## Turning a recording into a regression test
- Record with `record_trace(spirit, seconds, label, experiment, inputs, expected)`.
- `expected` **must** come from an independent measurement (ruler, handbook value), never from the measured result. Otherwise the test is circular.
- The test replays the trace through the replay transport and the experiment's `analyze()`, then asserts `|result − expected.value| ≤ expected.tolerance`.
