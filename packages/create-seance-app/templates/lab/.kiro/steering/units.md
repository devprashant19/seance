---
inclusion: fileMatch
fileMatchPattern: ["src/**/*.ts"]
---
# Unit rules

Physical values carry their unit in the type system. A wrong unit is a wrong lab result.

## Use
- Import from `seance-core/units`: `Unit`, `Quantity<U>`, `q`, `raw`, `add`, `sub`, `scale`, `ratio`, `convert`.
- Write physical values as `Quantity<'m'>`, `Quantity<'rad/s'>`, `Quantity<'m/s^2'>` — never as bare `number` in any public signature.
- Convert at the edge: transports convert browser units (deg/s, degrees) to canonical units (rad/s, rad).

## Canonical channel units
| Channel | Unit |
|---|---|
| `accel`, `accelG` | `m/s^2` |
| `gyro` | `rad/s` |
| `orientation` | `rad` |
| `audio.level` | `dBFS` |
