---
inclusion: fileMatch
fileMatchPattern: ["packages/**/*.ts", "apps/*/src/experiments/**/*.ts"]
---
# Unit rules (Séance)

Physical values carry their unit in the type system. A wrong unit is a wrong lab result, so treat these as hard rules.

## Use
- Import from `seance-core/units`: `Unit`, `Quantity<U>`, `q`, `raw`, `add`, `sub`, `scale`, `ratio`, `convert`.
- Write physical values as `Quantity<'m'>`, `Quantity<'rad/s'>`, `Quantity<'m/s^2'>` … never as bare `number` in any **public** signature, experiment input, `ExperimentResult`, or `SampleBatch` channel metadata.
- Derived units come from **named helpers** next to the physics, e.g. `gFromPendulum(L: Quantity<'m'>, T: Quantity<'s'>): Quantity<'m/s^2'>`. Do not add a generic `mul`/`div`.
- Convert at the **edge**: transports convert browser units (deg/s, degrees) to canonical units (rad/s, rad) before emitting a `SampleBatch`. Nothing downstream converts again.

## Allowed raw numbers
- Inside `packages/seance-core/src/signal/**` inner loops (typed arrays) — the function's doc comment must state the expected unit of its inputs and outputs.
- Dimensionless counts, indices, array lengths, percentages (use `Quantity<'1'>` if it crosses a public API).

## Canonical channel units
| Channel | Unit |
|---|---|
| `accel`, `accelG` | `m/s^2` |
| `gyro` | `rad/s` |
| `orientation` | `rad` |
| `audio.level`, `audio.spectrum` | `dBFS` |
| `camera.blob` | `px` |

## Adding a unit
1. Add it to the `Unit` union in `units.ts`.
2. Add conversion factors if it converts to another unit.
3. Add a case to the round-trip property test (`units.property.test.ts`).

## Review checklist (apply on every edit)
- [ ] No `number` where a quantity belongs in exported types.
- [ ] No double conversion (deg→rad applied twice).
- [ ] Every new result has `value`, `uncertainty`, `unit`, `method`, `assumptions`.
- [ ] `raw()` is used only at rendering or inside signal internals, never to "fix" a type error.

Reference: #[[file:packages/seance-core/src/units.ts]]
