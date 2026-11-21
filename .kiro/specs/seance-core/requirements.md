# Requirements Document — seance-core

## Introduction

`seance-core` is the skeleton of Séance: a TypeScript SDK that gives every device ("spirit") the same API, carries physical units in the type system, records and replays sensor data as Ghost Traces (`.seance` v1), measures data health, and provides the signal-processing and plugin primitives that experiments (Poltergeist Lab) and instruments (Banshee Choir) are built from.

Out of scope for this spec: the phone bridge network layer (see `phone-bridge` spec), avatars (`avatars-and-moods`), the MCP server (`seance-mcp`).

Conventions: names and shapes follow `phases/_shared/conventions.md` §5–§7 (copied into `docs/architecture.md`). Requirements marked **Property:** are invariants that must get property-based tests (fast-check).

## Requirements

### Requirement 1 — Unit-typed quantities

**User Story:** As an SDK developer, I want physical values to carry their unit in the type system, so that mixing metres and seconds is a compile error rather than a wrong lab result.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose a `Unit` union and a branded `Quantity<U>` type from `seance-core/units`.
2. WHEN code adds or subtracts two quantities with different units, THE SYSTEM SHALL fail type-checking.
3. THE SYSTEM SHALL provide explicit helper functions for multiplication and division that declare their result unit (e.g. `div(q(1,'m'), q(1,'s'))` is not allowed unless a helper defines `m/s`), so that derived units are never implied.
4. THE SYSTEM SHALL provide conversion functions for every supported pair (`deg↔rad`, `ms↔s`, `Pa↔GPa`, `deg/s→rad/s`).
5. **Property:** For every supported conversion A→B and any finite x, `convert(convert(x, A→B), B→A)` equals x within a relative error of 1e-12.
6. **Property:** Conversions are linear: `convert(a·x + b·y) = a·convert(x) + b·convert(y)` within 1e-9 relative error for non-affine units.

### Requirement 2 — The Spirit interface

**User Story:** As an app developer, I want one interface for phone motion, microphone, webcam, serial, BLE, MIDI, mock and replayed devices, so that experiments don't care where data comes from.

#### Acceptance Criteria

1. THE SYSTEM SHALL define `Spirit` with `id`, `kind`, `label`, `transport`, `capabilities`, `state`, `summon()`, `banish()`, `stream(channel)`, `health()` and `on(event, cb)` exactly as in conventions §6.
2. WHEN `summon()` is called on an `idle` spirit, THE SYSTEM SHALL move it to `summoning` and then to `present` once the first sample arrives, or to `error` with a reason.
3. WHEN `banish()` is called, THE SYSTEM SHALL stop all streams, release device resources, and move the spirit to `banished`.
4. WHEN `stream(channel)` is called for a channel not in `capabilities`, THE SYSTEM SHALL throw a typed `UnsupportedChannelError`.
5. WHEN a subscriber unsubscribes, THE SYSTEM SHALL stop delivering batches to it within one batch interval.
6. THE SYSTEM SHALL deliver `SampleBatch` values already converted to the channel's canonical unit (conventions §5 channel table).
7. **Property:** For any sequence of batches delivered on one channel, `seq` is strictly increasing and every `t` array is non-decreasing.
8. **Property:** In every batch, `values.length` equals the number of axes and every `values[i].length` equals `t.length`.

### Requirement 3 — Transports registry

**User Story:** As an SDK developer, I want transports to plug in behind the Spirit interface, so that new hardware is one file plus contract tests.

#### Acceptance Criteria

1. THE SYSTEM SHALL define `Transport` with `kind`, `isSupported()` and `connect(options): Promise<Spirit>`.
2. THE SYSTEM SHALL ship `mock`, `replay` and `local` transports in this spec; `phone-bridge` is delivered by the `phone-bridge` spec; `serial`, `bluetooth`, `midi` are stretch.
3. WHEN `isSupported()` is false (e.g. Web Serial on Safari), THE SYSTEM SHALL let apps hide the option and SHALL NOT throw at import time.
4. THE SYSTEM SHALL provide a shared contract test suite `runSpiritContract(makeSpirit)` that every transport passes (state machine, unit conversion, seq monotonicity, unsubscribe, banish releases resources).

### Requirement 4 — Mock transport

**User Story:** As a test author, I want a deterministic fake device, so that physics and UI can be tested without a phone.

#### Acceptance Criteria

1. THE SYSTEM SHALL generate signals from a seeded description (sine, damped sine, step, free-fall window, white noise, constant) on any channel.
2. THE SYSTEM SHALL support configurable nominal rate, timing jitter (as a percentage), dropout probability and additive noise.
3. WHEN created twice with the same seed and configuration, THE SYSTEM SHALL emit identical batches.
4. **Property:** For a mock with jitter 0 and no dropouts at rate r, the measured `health().rateHz` is within 1% of r after 2 s.

### Requirement 5 — Ghost Trace format v1

**User Story:** As a student and as a developer, I want to record, share and replay runs, so that results can be checked, compared and turned into tests.

#### Acceptance Criteria

1. THE SYSTEM SHALL encode and decode the `.seance` v1 JSON format defined in conventions §7.
2. WHEN decoding, THE SYSTEM SHALL validate `format === "seance-trace"` and `version === 1` and report every schema error with its JSON path.
3. WHEN a trace has `version` greater than supported, THE SYSTEM SHALL refuse it with a clear "newer trace format" error.
4. THE SYSTEM SHALL provide a `TraceRecorder` that subscribes to a spirit's channels and produces a trace with device info, clock info, calibration and inputs.
5. THE SYSTEM SHALL store `t` in milliseconds relative to the first sample on the laptop clock.
6. **Property:** For any valid trace, `decode(encode(trace))` deep-equals `trace` (numbers compared within float32 precision for `data`, exactly for `t`).
7. **Property:** Encoding is deterministic: encoding the same trace twice produces byte-identical output.

### Requirement 6 — Replay transport

**User Story:** As a judge on a laptop with no phone, I want recorded hauntings to behave like live spirits, so that I can try every experiment.

#### Acceptance Criteria

1. THE SYSTEM SHALL create a `revenant` spirit from a trace that exposes the trace's channels as capabilities.
2. WHEN replaying in real-time mode, THE SYSTEM SHALL deliver batches at the recorded timing (±1 animation frame).
3. THE SYSTEM SHALL support `as-fast-as-possible` mode for tests and `speed` multipliers (0.25×–4×) for the UI.
4. WHEN the trace ends, THE SYSTEM SHALL emit an `end` state and optionally loop.
5. **Property:** Replaying a trace in fast mode and re-recording it yields a trace whose channel data equals the original.

### Requirement 7 — Health model and moods

**User Story:** As a user, I want the ghost's mood to tell me whether my data is trustworthy, so that the theme carries real information.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute `rateHz`, `jitterPct`, `dropouts`, `noiseFloor` (when the spirit has been still) and `calibrated` over a sliding window (default 2 s).
2. THE SYSTEM SHALL map health to `calm | uneasy | restless | fading` using thresholds in a single file `src/health/thresholds.ts`.
3. WHEN no batch has arrived for more than 1 s, THE SYSTEM SHALL report `fading`.
4. THE SYSTEM SHALL attach a plain-language `reason` to every report.
5. THE SYSTEM SHALL apply hysteresis so the mood does not flicker more than once per second.
6. **Property:** The mood function is monotonic: increasing jitter, dropouts or noise (others fixed) never yields a calmer mood.

### Requirement 8 — Resampling and jitter report

**User Story:** As an experiment author, I want irregular samples resampled onto a uniform grid, so that FFT and period estimates are valid.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute jitter as the coefficient of variation of inter-sample intervals (std/mean × 100%) and report min/median/p95 interval.
2. THE SYSTEM SHALL resample a channel to a requested uniform rate using linear interpolation (default) or cubic interpolation (option).
3. WHEN a gap longer than `maxGapMs` (default 3 × median interval) is found, THE SYSTEM SHALL not interpolate across it and SHALL report it as a gap.
4. **Property:** For a pure sine of frequency f sampled with random jitter ≤ 30% at a mean rate ≥ 8f, resampling then estimating frequency returns f within 1%.

### Requirement 9 — Filters

**User Story:** As an experiment author, I want standard filters, so that noise can be removed visibly (the Exorcism slider) and correctly.

#### Acceptance Criteria

1. THE SYSTEM SHALL provide first-order low-pass and high-pass filters parameterised by cutoff frequency on a uniform grid.
2. THE SYSTEM SHALL provide a 2nd-order Butterworth biquad low-pass and a zero-phase (forward-backward) option for offline analysis.
3. THE SYSTEM SHALL provide a complementary filter fusing gyro rate and accelerometer tilt with a configurable time constant.
4. THE SYSTEM SHALL provide a scalar Kalman filter with process and measurement noise parameters.
5. **Property:** A low-pass filter applied to a constant signal returns the same constant after its settling time.
6. **Property:** For a sine well below cutoff (f ≤ fc/10) the low-pass output amplitude is within 2% of the input; well above (f ≥ 10·fc) it is attenuated by at least the filter's theoretical amount minus 1 dB.

### Requirement 10 — Spectral analysis

**User Story:** As the Singing Ruler experiment, I want an accurate dominant frequency from audio or motion data.

#### Acceptance Criteria

1. THE SYSTEM SHALL provide a real FFT for power-of-two lengths with Hann, Hamming and rectangular windows.
2. THE SYSTEM SHALL report bin resolution `Δf = fs / N` with every spectrum.
3. THE SYSTEM SHALL provide peak frequency estimation with parabolic (quadratic) interpolation between bins.
4. **Property (Parseval):** For any real signal and rectangular window, time-domain energy equals frequency-domain energy within 1e-9 relative error.
5. **Property:** For a sine whose frequency lies between bins, interpolated peak frequency is within Δf/10 of the true frequency (Hann window, SNR ≥ 20 dB).

### Requirement 11 — Event detection

**User Story:** As the Pendulum and Free-Fall experiments, I want robust zero-crossings, peaks and windows, so that periods and fall times are correct on noisy data.

#### Acceptance Criteria

1. THE SYSTEM SHALL detect zero-crossings with hysteresis (a band ±h) and sub-sample timing by linear interpolation.
2. THE SYSTEM SHALL detect peaks with minimum prominence and minimum distance parameters.
3. THE SYSTEM SHALL detect windows where a signal stays below/above a threshold for at least a minimum duration (used for free fall: |a| ≈ 0).
4. **Property:** For a noiseless sine of period T, consecutive same-direction zero-crossing intervals equal T within 0.1% for any phase.
5. **Property:** Adding noise with amplitude below the hysteresis band never adds extra crossings.

### Requirement 12 — Damping and fits

**User Story:** As an experiment author, I want logarithmic decrement and linear fits with uncertainty, so that every result has an honest error bar.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute logarithmic decrement δ = (1/n)·ln(x₀/xₙ) from successive peaks and damping ratio ζ = δ/√(4π² + δ²).
2. THE SYSTEM SHALL provide ordinary and weighted least-squares line fits returning slope, intercept, their standard errors, covariance and R².
3. THE SYSTEM SHALL provide uncertainty propagation helpers for products/quotients/powers (relative errors in quadrature) and a generic first-order propagation using partial derivatives.
4. **Property:** For points generated exactly on y = a·x + b, the fit returns a and b within 1e-9 and standard errors of 0 (within 1e-9).
5. **Property:** For a synthetic damped sine with known ζ in [0.005, 0.2], estimated ζ is within 10% relative error at SNR ≥ 30 dB.

### Requirement 13 — Plugin API

**User Story:** As a developer adding an experiment or instrument, I want a declarative definition, so that a spec can be turned into a working plugin (hook H1).

#### Acceptance Criteria

1. THE SYSTEM SHALL export `defineExperiment(def)` with the fields in conventions §6 and SHALL validate them at definition time (unique id, known spirits/channels, non-empty steps, at least one safety line).
2. THE SYSTEM SHALL require `analyze` to return an `ExperimentResult` whose `primary` has `value`, `uncertainty`, `unit`, `method` and `assumptions`.
3. THE SYSTEM SHALL export `defineInstrument(def)` with `id`, `title`, `spirits`, `channels`, `createAudioGraph(ctx)` and `map(batch, state)`.
4. THE SYSTEM SHALL provide a registry so apps can list experiments and instruments without importing each file manually.
5. WHEN `analyze` is given a trace missing a required channel, THE SYSTEM SHALL return a result with `confidence: 'low'` and a warning instead of throwing.

### Requirement 14 — Packaging and public API

**User Story:** As an app developer, I want a small public surface, so that apps never depend on internals (hook H5).

#### Acceptance Criteria

1. THE SYSTEM SHALL expose its public API only via the package `exports` map (`seance-core`, `seance-core/units`, `seance-core/signal`, `seance-core/trace`, `seance-core/testing`).
2. THE SYSTEM SHALL have no runtime dependency on React or any DOM API except inside the `local` transport.
3. THE SYSTEM SHALL run its full test suite under Node (Vitest) with no browser.
