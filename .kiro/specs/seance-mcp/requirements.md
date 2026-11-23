# Requirements Document — seance-mcp

## Introduction

`seance-mcp` is a Model Context Protocol server (stdio) that lets Kiro observe Séance spirits (phones and other devices) and ghost traces while it develops the project. Kiro gets hardware-in-the-loop context: live sensor streams with units, recorded traces, timing statistics and experiment results. The server reuses `seance-core` for all health and physics computations and never re-implements them. It runs in two modes. **Live** mode observes a relay room. **Offline** mode reads only `fixtures/traces/`.

Glossary: *spirit* = a connected device; *trace* = a `.seance` v1 recording; *observer* = a read-only relay room member; *fixtures dir* = `fixtures/traces/` relative to the project root.

## Requirements

### Requirement 1 — Server lifecycle and modes

**User Story:** As a developer using Kiro, I want the Séance MCP server to start reliably whether or not a relay is running, so that Kiro always has access to at least my recorded traces.

#### Acceptance Criteria
1. WHEN Kiro launches the server, THE SYSTEM SHALL complete the MCP initialize handshake over stdio within 3 seconds.
2. THE SYSTEM SHALL write only MCP JSON-RPC frames to stdout and SHALL write all logs to stderr.
3. WHEN no relay URL is configured OR the relay is unreachable, THE SYSTEM SHALL start in offline mode without error.
4. WHILE in offline mode with a relay URL configured, THE SYSTEM SHALL retry the relay connection every 10 seconds and SHALL switch to live mode on success.
5. WHERE `--offline` or `SEANCE_OFFLINE=1` is set, THE SYSTEM SHALL never connect to a relay.
6. WHEN connected to a relay, THE SYSTEM SHALL join the configured room with role `observer` and SHALL NOT send control messages to spirits.

**Property:** For any sequence of relay connect/disconnect events, the server's reported `mode` equals `live` if and only if the relay connection is open.

### Requirement 2 — list_spirits

**User Story:** As Kiro, I want to see which spirits are connected right now and how healthy their data is, so that I can reason about live hardware behaviour.

#### Acceptance Criteria
1. WHEN `list_spirits` is called in live mode, THE SYSTEM SHALL return every spirit in the room with id, kind, label, transport, platform, state, channels (with units and nominal rates) and a HealthReport.
2. THE SYSTEM SHALL compute each HealthReport with `seance-core`'s health function, so that it matches the mood the avatar shows.
3. WHEN `list_spirits` is called in offline mode, THE SYSTEM SHALL return `mode: "offline"`, an empty spirit list, the number of fixtures available and a hint, and SHALL NOT return an error.
4. THE SYSTEM SHALL NOT include the observer itself in the returned spirit list.

**Property:** For any room roster, the number of returned spirits equals the number of non-observer members.

### Requirement 3 — trace_stats

**User Story:** As Kiro, I want timing and noise statistics for any recorded trace, so that I can tell whether bad results come from bad data.

#### Acceptance Criteria
1. WHEN `trace_stats` is called with a trace id or a fixtures-relative path, THE SYSTEM SHALL return per-channel sample count, rate (mean and median), interval statistics, jitter %, dropouts, longest gap, noise floor with unit and method, clock info and mood.
2. THE SYSTEM SHALL define jitter as 100 × std(Δt) / mean(Δt) and a dropout as a sequence gap or Δt > 2.5 × median Δt, identically to `seance-core`.
3. WHEN `trace_stats` is called without a trace, THE SYSTEM SHALL list all fixtures with one-line stats, newest first.
4. IF the trace path resolves outside the fixtures dir, THEN THE SYSTEM SHALL return `PATH_OUTSIDE_FIXTURES`.
5. IF the file fails v1 schema validation, THEN THE SYSTEM SHALL return `TRACE_INVALID` naming the failing field.
6. THE SYSTEM SHALL work identically in live and offline modes.

**Property:** For any valid trace, `trace_stats` jitter, dropouts and rate equal `seance-core.computeHealth` on the same samples.
**Property:** Jitter is 0 for any trace with perfectly uniform timestamps.

### Requirement 4 — record_trace

**User Story:** As Kiro, I want to capture a real recording from a connected spirit into the repo, so that real-world data becomes a regression test.

#### Acceptance Criteria
1. WHEN `record_trace` is called with a spirit, a duration and a label in live mode, THE SYSTEM SHALL collect that many seconds of samples (future by default, or from the buffer when `source: "buffer"`).
2. THE SYSTEM SHALL write a v1 `.seance` file to `fixtures/traces/<id>.seance`, where id = `<ISO time with - for :>_<experiment|free>_<device slug>`, using an atomic temp-file rename.
3. THE SYSTEM SHALL encode with `seance-core`'s encoder, decode the result, and refuse to write IF the round trip is not lossless.
4. WHERE `experiment`, `inputs` or `expected` are provided, THE SYSTEM SHALL store them in the trace.
5. THE SYSTEM SHALL NOT derive `expected` from the measured result.
6. IF `seconds` exceeds the configured maximum (default 60), THEN THE SYSTEM SHALL return `TOO_LONG`.
7. IF called in offline mode, THEN THE SYSTEM SHALL return `OFFLINE` with a hint.
8. WHEN the file is written, THE SYSTEM SHALL return the path, id, byte size, duration, channels, sample counts, timing stats, an analysis summary when an experiment is set, and a `nextStep` note that hook H2 will generate a test.

**Property:** For any buffer of samples, record → decode yields the same sample count, timestamps (within 0.001 ms), values (within float32 precision), units and axes.

### Requirement 5 — read_stream

**User Story:** As Kiro, I want to read recent samples of one channel with units, so that I can watch a live behaviour while debugging.

#### Acceptance Criteria
1. WHEN `read_stream` is called with a spirit and a channel in live mode, THE SYSTEM SHALL return the unit, axes, window, sample count, rate, jitter, dropouts, per-axis mean/std/min/max, and a decimated sample array.
2. THE SYSTEM SHALL never return more than `maxPoints` (default 200, maximum 500) decimated points per axis.
3. WHEN `waitForFresh` is true, THE SYSTEM SHALL collect the next `seconds` of data instead of returning buffered data.
4. WHERE the channel is `audio.spectrum`, THE SYSTEM SHALL return the top 10 spectral peaks with frequency (Hz) and level (dBFS) instead of all bins.
5. IF the spirit or channel does not exist, THEN THE SYSTEM SHALL return `SPIRIT_NOT_FOUND` or `CHANNEL_NOT_FOUND`.

**Property:** Min-max decimation preserves the global min and max of every axis.

### Requirement 6 — run_experiment

**User Story:** As Kiro, I want to run an experiment's analysis on a trace and see how the number was produced, so that I can debug physics results.

#### Acceptance Criteria
1. WHEN `run_experiment` is called with a trace, THE SYSTEM SHALL run the experiment's pure `analyze()` function (from the trace's `experiment`, or the given one) and return the ExperimentResult with explicit units, uncertainty, method, assumptions, warnings and confidence.
2. WHEN the trace has `expected`, THE SYSTEM SHALL return `vsExpected` with delta, tolerance and pass/fail.
3. THE SYSTEM SHALL return a `pipeline` description (resample rate, filter, segment/oscillation count).
4. WHERE `options.skipResample` is true, THE SYSTEM SHALL analyse raw timestamps, for comparison.
5. IF required inputs are missing from both the trace and the call, THEN THE SYSTEM SHALL return `INPUT_MISSING` listing them.

**Property:** For any synthetic pendulum trace generated from the forward model with L ∈ [0.1, 2] m and g ∈ [9.7, 9.9] m/s², `run_experiment` recovers g within its reported uncertainty.

### Requirement 7 — compare_traces

**User Story:** As Kiro, I want to diff two traces, so that I can find out why one run is worse than another.

#### Acceptance Criteria
1. WHEN `compare_traces` is called with two traces, THE SYSTEM SHALL return timing differences (rate, jitter, dropouts, longest gap) for a shared channel.
2. WHEN both traces are at least 5 s long and share a channel, THE SYSTEM SHALL resample both to a common grid and return the RMS difference with unit and both dominant frequencies.
3. WHEN both traces have the same experiment and `runExperiment` is true, THE SYSTEM SHALL return both results and their delta.
4. THE SYSTEM SHALL return `likelyCauses` derived only from the thresholds in `seance-core`, not from free-text generation.

**Property:** `compare_traces(a, a)` returns zero timing deltas, zero RMS difference and zero result delta.

### Requirement 8 — Safety and privacy

**User Story:** As a developer, I want the MCP server to be safe to auto-approve for read-only tools, so that Kiro can use it freely.

#### Acceptance Criteria
1. THE SYSTEM SHALL write files only inside the fixtures dir and SHALL reject `..`, absolute paths and symlinks that escape it.
2. THE SYSTEM SHALL NOT transmit or store raw audio; audio channels carry features only.
3. THE SYSTEM SHALL reject unknown properties in every tool input.
4. THE SYSTEM SHALL emit every physical quantity with an explicit unit.
