# Real Traces & Regression Fixtures Summary

## Trace Repository
Séance records raw sensor streams into `.seance` binary/JSON files containing hardware capabilities, timestamps, and multi-channel readings.

| Trace File | Experiment | Sampling Rate | Duration | Channels |
|---|---|---|---|---|
| `2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance` | Pendulum oscillation | 60 Hz | 30.0 s | `accelG`, `gyro` |
| `2026-11-22T10-00-00Z_probe-pendulum_phoneB.seance` | Coupled pendulum | 60 Hz | 30.0 s | `accelG`, `gyro` |
| `2026-11-22T14-30-00Z_free-fall_cushion.seance` | Free fall drop | 100 Hz | 5.0 s | `accel` |
| `2026-11-22T16-00-00Z_singing-ruler_steel.seance` | Cantilever acoustic | 44.1 kHz | 4.0 s | `audio.spectrum` |
| `2026-11-23T11-00-00Z_spin-find-chip_desk.seance` | Centripetal spin | 60 Hz | 15.0 s | `gyro`, `accelG` |

All traces are checked against automated regression suites to guarantee physical stability and prevent DSP degradation.
