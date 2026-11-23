# Requirements Document — Experiment: Singing Ruler ("Hear the Stiffness")

## Introduction

Estimate the Young's modulus E of a ruler from the pitch of its vibration. A ruler clamped to a desk is a cantilever; its first natural frequency f₁ depends on E, density, thickness and free length (Euler–Bernoulli beam theory). The laptop microphone (a `banshee` spirit on the `local` transport) hears f₁. This is the flagship mechanical-engineering experiment. This file is the input to hook **H1 (summon-experiment)**. Physics reference: `phases/phase-05-poltergeist-lab-mvp/experiments-mvp.md` §3.

### Experiment metadata

| Key | Value |
|---|---|
| id | `singing-ruler` |
| title / spookyTitle | Singing ruler — Young's modulus / Hear the Stiffness |
| spirits | `banshee` (laptop or phone microphone) |
| channels | `audio.level` (dBFS), `audio.spectrum` (dBFS per bin; bin centre frequency in Hz as each axis label) |
| inputs | `L` free overhang [m], default 0.060 ± 0.001, range [0.02, 0.30]; `h` thickness [m], default 0.00050 ± 0.00002, range [0.0002, 0.005]; `material` preset (stainless steel, carbon steel, aluminium, acrylic, polystyrene) giving ρ ± u(ρ) and the reference E range |
| primary result | E [GPa] |
| reference | material preset's handbook range (midpoint ± half-range/√3) |
| accuracy target | single length: within ±20% of the handbook range for steel; multi-length fit (optional): ±10% |
| min recording | 0.5 s of room noise, then 3 plucks |
| safety | Clamp firmly with a heavy book and your hand or a C-clamp · Don't pluck towards anyone's face · Keep loose sleeves and cables away from the ruler |

## Requirements

### Requirement 1 — Microphone setup

**User Story:** As a student, I want the microphone configured for measurement, so that the browser doesn't erase the ruler's tone.

#### Acceptance Criteria

1. WHEN the experiment starts the microphone, THE SYSTEM SHALL request audio with echo cancellation, noise suppression and automatic gain control all disabled.
2. THE SYSTEM SHALL analyse with an FFT size of 32768 and no spectral smoothing, and SHALL store only spectrum frames (about 10 per second, band-limited to about 25–1200 Hz) and levels in the trace — never raw audio.
3. IF microphone permission is denied, THEN THE SYSTEM SHALL explain how to allow it and offer replay mode.

### Requirement 2 — Choosing the overhang

**User Story:** As a student, I want to know before plucking whether the microphone can hear my ruler, so that I don't waste attempts.

#### Acceptance Criteria

1. WHEN L, h and material are set, THE SYSTEM SHALL display the predicted f₁ = (1.8751²/2π) · (h/L²) · √(E_ref/(12ρ)).
2. IF the predicted f₁ is below 40 Hz, THEN THE SYSTEM SHALL warn "too low for the microphone — shorten the overhang" and suggest an overhang that gives about 100 Hz.
3. IF the predicted f₁ is above 1500 Hz, THEN THE SYSTEM SHALL warn that the tone will be faint and short and suggest a longer overhang.

### Requirement 3 — Frequency measurement

**User Story:** As a student, I want the ruler's fundamental frequency measured precisely, so that frequency is never my largest error.

#### Acceptance Criteria

1. THE SYSTEM SHALL detect plucks as `audio.level` rises of at least 15 dB above the running noise floor (median of the previous 1 s).
2. THE SYSTEM SHALL estimate the room noise spectrum from the frames in the 0.5 s before the first pluck and subtract it from each pluck's averaged power spectrum (frames from onset + 50 ms to onset + 600 ms).
3. THE SYSTEM SHALL search for the peak within [0.4, 2.5] × the predicted f₁ and, IF a peak near half that frequency carries at least 30% of its power, THEN THE SYSTEM SHALL choose the lower peak.
4. THE SYSTEM SHALL refine the peak frequency by parabolic interpolation of the log-magnitude around the peak bin.
   **Property:** for a synthetic decaying sinusoid at f ∈ [40, 1000] Hz with noise at SNR ≥ 15 dB, analysed through the same spectrum framing, the estimated f₁ is within 0.2 Hz or 0.2% of f, whichever is larger.
5. IF the chosen peak lies within 2 Hz of 50, 100, 150, 60, 120 or 180 Hz AND the same peak exists in the noise spectrum, THEN THE SYSTEM SHALL reject it and emit a major "mains hum" diagnostic.
6. THE SYSTEM SHALL report f₁ as the mean over plucks with u(f₁) = max(s/√n, Δf/10).

### Requirement 4 — Young's modulus

**User Story:** As a student, I want E from my measurement with its uncertainty, so that I can compare with the handbook value.

#### Acceptance Criteria

1. THE SYSTEM SHALL compute E = 48 π² f₁² ρ L⁴ / (1.8751⁴ · h²).
   **Property:** for any E ∈ [1, 250] GPa, ρ ∈ [900, 9000] kg/m³, h ∈ [0.2, 5] mm and L ∈ [20, 300] mm, computing f₁ from the forward model and then E from f₁ returns the input E within 1e-9 relative error.
   **Property:** E is independent of ruler width (width is not an input).
2. THE SYSTEM SHALL report u(E)/E = √((2u(f)/f)² + (4u(L)/L)² + (2u(h)/h)² + (u(ρ)/ρ)²) and the share of each term.
   **Property:** u(E) never decreases when u(h) increases, all else fixed.
3. THE SYSTEM SHALL list the assumptions: Euler–Bernoulli thin beam, rectangular uniform section, perfectly rigid clamp (and that a flexible clamp makes E appear low), first mode dominant, air loading neglected.
4. WHEN E is below the reference AND z > 2, THE SYSTEM SHALL rank clamp compliance as the first suspect.

### Requirement 5 — Multi-length fit (optional, may be deferred to Phase 8)

**User Story:** As an advanced student, I want to remove the clamp error by measuring several overhangs, so that my E is closer to the handbook value.

#### Acceptance Criteria

1. WHERE the user records f₁ at 4 or more overhang lengths, THE SYSTEM SHALL fit 1/√f₁ against L, compute K = 1/slope², the clamp's hidden length ΔL = intercept/slope, and E = 48 π² ρ K² / (1.8751⁴ h²), with uncertainties from the fit.
   **Property:** for synthetic data generated with any ΔL ∈ [0, 5] mm, the fit recovers ΔL within 0.2 mm and E within 1% when noise is zero.
2. THE SYSTEM SHALL display the fitted ΔL as "your clamp hides X mm of ruler".

### Requirement 6 — Data quality

**User Story:** As a student, I want to know when the recording is unusable, so that I re-record instead of trusting it.

#### Acceptance Criteria

1. IF the peak is less than 10 dB above the noise spectrum, THEN THE SYSTEM SHALL emit a major low-SNR diagnostic.
2. IF `audio.level` exceeds −1 dBFS, THEN THE SYSTEM SHALL emit a minor clipping diagnostic.
3. IF the refined peak lies at the search-band edge, THEN THE SYSTEM SHALL emit a major diagnostic asking the user to check thickness and material.
4. IF the per-pluck frequencies differ by more than 3% (s/f̄), THEN THE SYSTEM SHALL emit a minor "clamp may be slipping" diagnostic.
5. THE SYSTEM SHALL pass the result, diagnostics, budget and trace statistics to the Physics Oracle.

### Requirement 7 — Visuals and notebook

**User Story:** As a student, I want to see the sound and get a report template, so that the experiment is memorable and easy to write up.

#### Acceptance Criteria

1. WHILE listening, THE SYSTEM SHALL show the live spectrum (Banshee hair strands in the avatar, plus a chart) with the predicted f₁ marked.
2. THE SYSTEM SHALL provide a `notebook.md` template with Aim, Apparatus, Theory (cantilever first mode, β₁L = 1.8751, derivation of E), Method (including safety), Data, Calculations, Uncertainty, Result, Assumptions and Conclusion sections.
