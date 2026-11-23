# Requirements Document — Experiment: Pendulum Gravity ("The Swinging Spirit")

## Introduction

Measure the gravitational acceleration g by swinging a phone on a cord and timing its period with the gyroscope. This file is the input to hook **H1 (summon-experiment)**: saving it scaffolds or syncs `apps/poltergeist-lab/src/experiments/pendulum-g/`. Physics reference: `phases/phase-05-poltergeist-lab-mvp/experiments-mvp.md` §1.

### Experiment metadata

| Key | Value |
|---|---|
| id | `pendulum-g` |
| title / spookyTitle | Pendulum gravity / The Swinging Spirit |
| spirits | `poltergeist` |
| channels | `gyro` (rad/s, primary), `accelG` (m/s², hang check + diagnostics) |
| inputs | `d` pivot → phone centre [m], default 0.60 ± 0.005, range [0.1, 2.0]; `a` phone length [m], optional, default 0.15 ± 0.002; `b` phone width [m], optional, default 0.07 ± 0.002; `swingPlane` = `faceOn` \| `edgeOn` (default `faceOn`); `latitudeDeg`, `altitudeM` optional |
| primary result | g [m/s²] |
| reference | 9.81 m/s² (standard gravity), or the international gravity formula when latitude/altitude are entered |
| accuracy target | within 3% of reference on 2+ phones |
| min recording | 10 full periods after a 0.5 s settle |
| safety | Swing over a bed or other soft surface · Tie the cord through the case and test the knot · Keep people, glass and screens out of the swing path · Keep the swing small (≤ 15°) |

## Requirements

### Requirement 1 — Inputs

**User Story:** As an engineering student, I want to enter the pendulum length with its uncertainty, so that the result reflects how well I measured it.

#### Acceptance Criteria

1. WHEN the user starts the experiment, THE SYSTEM SHALL ask for the pivot-to-phone-centre length d with an uncertainty, accepting m, cm or mm.
2. WHERE the user provides phone length a (and width b), THE SYSTEM SHALL apply the physical-pendulum correction L_eff = d + k²/d with k² = (a² + t²)/12 ≈ a²/12 for face-on swings or (a² + b²)/12 for edge-on swings.
3. IF phone dimensions are not provided, THEN THE SYSTEM SHALL use L_eff = d and record the point-mass assumption.

### Requirement 2 — Readiness and recording

**User Story:** As a student, I want the app to tell me when the phone is hanging and swinging properly, so that I record usable data.

#### Acceptance Criteria

1. WHILE in READY_CHECK, THE SYSTEM SHALL require that gravity in `accelG` is within 30° of a single device axis (the phone hangs steadily) before enabling Start.
2. WHILE the phone swings, THE SYSTEM SHALL count detected periods live and display the count.
3. WHEN at least 12 periods have been detected, THE SYSTEM SHALL offer to stop automatically.

### Requirement 3 — Period detection

**User Story:** As a student, I want an accurate period from many swings, so that timing is not my largest error.

#### Acceptance Criteria

1. THE SYSTEM SHALL resample `gyro` to a uniform rate, project it onto the principal swing axis found by PCA, remove the bias, and low-pass filter it at 5 × the expected frequency.
2. THE SYSTEM SHALL detect zero-crossings with hysteresis and linear interpolation between samples.
3. THE SYSTEM SHALL reject crossings whose half-period differs by more than 10% from the median half-period.
4. WHEN at least 20 accepted crossings exist, THE SYSTEM SHALL estimate T as twice the slope of a linear fit of crossing time against crossing index, with u(T) = 2 × the slope's standard error.
5. IF fewer than 20 accepted crossings exist, THEN THE SYSTEM SHALL not report g and SHALL ask the user to let it swing at least 10 times.
   **Property:** for a synthetic swing signal with any swing-axis direction (random unit vector), the estimated T is the same within 0.1%.
   **Property:** for synthetic signals sampled at any uniform rate in [40, 120] Hz, with timestamp jitter up to 20%, the estimated T is within 0.5% of the true T.

### Requirement 4 — Gravity with corrections

**User Story:** As a student, I want g corrected for real-world effects, so that my result is closer to the truth and I learn why.

#### Acceptance Criteria

1. THE SYSTEM SHALL estimate the amplitude θ₀ as the RMS over analysed cycles of ω_peak · T / (2π).
2. THE SYSTEM SHALL compute T₀ = T / (1 + θ₀²/16), and SHALL include the 11θ₀⁴/3072 term when θ₀ > 20°.
3. THE SYSTEM SHALL compute g = 4π² · L_eff / T₀².
   **Property:** for any L in [0.1, 2.0] m, g in [9.7, 9.9] m/s², θ₀ in [2°, 20°], and added Gaussian noise of up to 2% of the peak angular velocity, a synthetic trace generated from the forward model yields g within its reported uncertainty of the input g in at least 95% of cases.
   **Property:** g computed for pendulum length 2L from a trace generated with length 2L equals g for length L from a trace generated with length L, within 0.5%.
4. IF g lies outside [8.5, 11.0] m/s², THEN THE SYSTEM SHALL flag a major diagnostic suggesting a length or unit mistake.
5. IF θ₀ exceeds 25°, THEN THE SYSTEM SHALL emit a minor diagnostic recommending smaller swings.

### Requirement 5 — Uncertainty

**User Story:** As a student, I want to know which measurement limits my accuracy, so that I know what to improve.

#### Acceptance Criteria

1. THE SYSTEM SHALL report u(g)/g = √((u(L)/L)² + (2·u(T)/T)²) and the share of each term.
   **Property:** increasing u(d) while all else is fixed never decreases u(g).
   **Property:** the reported shares of the budget terms sum to 1.
2. THE SYSTEM SHALL list the systematic assumptions with their estimated size: amplitude correction applied, physical-pendulum correction applied or not, cord stretch and air drag neglected.

### Requirement 6 — Data quality

**User Story:** As a student, I want to be warned when the data can't be trusted, so that I don't believe a bad number.

#### Acceptance Criteria

1. IF sampling jitter exceeds 30% in the analysed window, THEN THE SYSTEM SHALL warn the user and mark the result as low confidence.
2. IF the half-period scatter exceeds 2% OR the second PCA axis carries more than 30% of the angular-velocity variance, THEN THE SYSTEM SHALL emit a minor "phone twisting on its string" diagnostic.
3. THE SYSTEM SHALL pass the result, diagnostics, budget and trace statistics to the Physics Oracle.

### Requirement 7 — Notebook

**User Story:** As a student, I want a lab-report template filled with my run, so that writing up is fast.

#### Acceptance Criteria

1. THE SYSTEM SHALL provide a `notebook.md` template with Aim, Apparatus, Theory (T₀ = 2π√(L/g), amplitude and physical-pendulum corrections, validity), Method, Data, Calculations, Uncertainty, Result, Assumptions and Conclusion sections.
2. THE SYSTEM SHALL include the safety notices in the notebook's Method section.
