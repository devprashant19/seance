# Requirements Document — Phase U1: seance-sonify + Ghost Ear MVP

## Introduction

Phase U1 builds `packages/seance-sonify` and the Ghost Ear accessible laboratory mode in Poltergeist Lab (`/hear`).
Ghost Ear allows a blindfolded or low-vision student to conduct physics experiments—starting with **The Swinging Spirit (`pendulum-g`)**—using sound, speech, keyboard navigation, and orientation scrubbing alone, without ever looking at the screen.

---

## Requirements

### Requirement 1 — Continuous Value-to-Tone Mapping (`mapping.ts`)
**User Story:** As a blind student running an experiment, I want the pitch and texture of the sound to continuously reflect the sensor value and measurement uncertainty, so that I can hear the physical motion in real time.

#### Acceptance Criteria
1. THE SYSTEM SHALL calculate pitch logarithmically: `u = clamp((x - min) / (max - min), 0, 1)`, `f = fmin · (fmax / fmin)^u`, with `fmin = 220 Hz` (A3) and `fmax = 1320 Hz` (E6).
2. THE SYSTEM SHALL map pan across stereo channels: `pan = 2u - 1` with a low-pass filter (smoothing factor α = 0.2) to eliminate audio zipper noise.
3. THE SYSTEM SHALL map signal uncertainty `sigma` to amplitude tremolo depth: `depth = min(0.45, 2.5 · sigma / (max - min))` at 6 Hz rate, such that high confidence sounds steady and noisy signals audibly warble.
4. THE SYSTEM SHALL map device health mood to sound texture: `calm` = pure tone; `uneasy` = detuned partial (+5 cents); `restless` = blended noise layer; `fading` = volume ducking (-6 dB).
5. **Property (Monotonic Pitch):** For any valid range `[min, max]` where `max > min`, and any two inputs `x1 < x2`, `mapToTone(x1).freqHz <= mapToTone(x2).freqHz`.
6. **Property (Frequency Bounds):** For any finite real input `x` and any finite range, `mapToTone(x).freqHz` SHALL strictly remain within `[220, 1320] Hz`, and SHALL never produce `NaN` or `Infinity`.
7. **Property (Tremolo Monotonicity):** For any fixed range and input, `tremoloDepth` SHALL be monotonically non-decreasing with `sigma`, and bounded by `[0, 0.45]`.

---

### Requirement 2 — Landmark Earcons (`earcons.ts`)
**User Story:** As a listener, I want distinct auditory icons (earcons) for physical landmarks like equilibrium crossings, peaks, and dropouts, so that I can count swings and detect disruptions by ear.

#### Acceptance Criteria
1. THE SYSTEM SHALL generate earcons for:
   - `zero-crossing`: 8 ms band-passed noise click (~2 kHz);
   - `peak`: dual-partial chime (880 Hz + 1320 Hz, 120 ms);
   - `trough`: lower dual chime (440 Hz + 660 Hz, 120 ms);
   - `dropout`: 120 Hz low-frequency thud;
   - `start`: rising two-tone chirp (330 Hz → 660 Hz);
   - `stop`: falling two-tone chirp (660 Hz → 330 Hz);
   - `result`: ascending three-note major triad motif (523 Hz, 659 Hz, 784 Hz).
2. THE SYSTEM SHALL detect zero-crossings using `detectZeroCrossings` with hysteresis from `seance-core/dsp/events.ts`.
3. **Property (Zero-Crossing Integrity):** For any continuous waveform, the count of `zero-crossing` earcons SHALL equal the number of detected threshold transitions, with exactly zero earcons emitted inside the hysteresis deadband.

---

### Requirement 3 — Spoken Results & Speech Synthesis (`speech.ts`)
**User Story:** As an accessible lab user, I want the system to speak the experimental result with natural scientific phrasing, proper unit expansion, and explicit uncertainties, so that I receive an honest report.

#### Acceptance Criteria
1. THE SYSTEM SHALL format results with uncertainty rounded to 1–2 significant figures and the value rounded to matching precision.
2. THE SYSTEM SHALL expand abbreviations to natural spoken units (e.g. "m/s^2" → "metres per second squared", "Pa" → "pascals", "Hz" → "hertz", "m" → "metres").
3. THE SYSTEM SHALL speak urgent warnings (dropouts, completion) immediately by calling `speechSynthesis.cancel()` before speaking.
4. THE SYSTEM SHALL mirror all spoken output into an HTML element with `aria-live="polite"` and `role="status"` for screen reader users.
5. **Property (Result Sentence Determinism):** For any result object `{ label, value, uncertainty, unit }`, `resultSentence` SHALL produce a deterministic non-empty string that includes both the numeric uncertainty and the full spoken unit.

---

### Requirement 4 — Safe Audio Limiter (`limiter.ts`)
**User Story:** As a student wearing headphones, I want automatic output limiting so that noisy or clipping sensor inputs cannot produce painfully loud sounds.

#### Acceptance Criteria
1. THE SYSTEM SHALL configure a `DynamicsCompressorNode` (threshold: -12 dB, knee: 10, ratio: 20, attack: 3 ms, release: 50 ms) followed by master output gain capped at 0.5 (-6 dBFS).
2. **Property (Limiter Attenuation Bound):** For any input signal amplitude up to ±100.0, the computed limited output peak SHALL NOT exceed 0.5.

---

### Requirement 5 — Orientation Scrubbing ("Wand Mode", `scrub.ts`)
**User Story:** As a blind student reviewing a recorded pendulum swing, I want to tilt my phone or press arrow keys to scrub through time, hearing the sound at each moment, so that I can inspect the data trajectory.

#### Acceptance Criteria
1. THE SYSTEM SHALL map roll angle `gamma` in `[-45°, +45°]` with ±1.5° dead zone to index `0 .. N-1` in the sample buffer.
2. THE SYSTEM SHALL low-pass filter orientation changes with α = 0.15 to prevent jumpy playback.
3. **Property (Scrub Bounds):** For any angle between -180° and +180°, `scrubIndex` SHALL return an integer index strictly within `[0, N-1]`.

---

### Requirement 6 — Ghost Ear Route in Poltergeist Lab (`/hear`)
**User Story:** As any user in Poltergeist Lab, I want a dedicated `/hear` route and a "Hear this result" button on experiment cards, so that I can experience audio-first science.

#### Acceptance Criteria
1. THE SYSTEM SHALL provide route `/hear` with full keyboard support (`Space` start/stop, `R` repeat result, `P` pause/play, `Left/Right` scrub, `H` help, `Esc` cancel).
2. WHEN run without a connected phone, THE SYSTEM SHALL play the bundled real pendulum trace through the identical sonification and speech pipeline.
3. THE SYSTEM SHALL provide a "Hear this result" button on `OraclePanel` in Poltergeist Lab that invokes `resultSentence` and sonifies the verdict.

---

### Requirement 7 — MCP Sonification Tools (`seance-mcp`)
**User Story:** As an AI assistant or automated reviewer, I want MCP tools to inspect and audit sonification outputs against trace data, so that I can verify auditory fidelity.

#### Acceptance Criteria
1. THE SYSTEM SHALL provide tool `accessible_result(tracePath, experimentId)` returning landmarks, value, uncertainty, unit, and spoken sentence.
2. THE SYSTEM SHALL provide tool `audit_sonification(tracePath)` returning pitch dynamic range, clipping events, and earcon collision metrics.
