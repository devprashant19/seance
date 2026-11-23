# Requirements Document — Experiment: Spin & Find the Chip ("Where Does the Spirit Live?")

## Introduction

The user spins their phone face-up on a table. From the gyroscope's angular velocity and the accelerometer's in-plane acceleration, the experiment locates the motion sensor (IMU) inside the phone body relative to the spin axis (≈ centre of mass), using the rigid-body relation a = α ẑ × r − ω² r. It teaches IMU mounting offset, a real problem in vehicle and drone navigation.

**Experiment metadata (for hook H1)**
- id: `spin-find-chip`
- spirits: `poltergeist`
- channels: `gyro` (rad/s), `accel` (m/s^2, gravity removed) or `accelG` (m/s^2)
- inputs: phone outline width W (m) and height H (m) with uncertainty (presets: 0.071 × 0.147 m, 0.075 × 0.160 m; or custom)
- primary result: distance |r| of the sensor from the spin axis (m); extras: rₓ, r_y (m), distance from top edge and left edge (m), spin rate (Hz), number of spins used
- reference: none built in (validated by repeatability, synthetic tests and an optional pivot-offset check)
- safety: "Spin gently on a table, away from the edge. Not on glass."

## Requirements

### Requirement 1 — Rest and bias capture

**User Story:** As a student, I want the phone's resting offsets removed before spinning, so that tilt and bias don't move the dot.

#### Acceptance Criteria
1. WHEN the experiment starts, THE SYSTEM SHALL ask the user to lay the phone face-up and hold it still for 2 s.
2. WHILE |ω| < 0.02 rad/s on all axes for 2 s, THE SYSTEM SHALL record the mean in-plane acceleration as the in-plane bias and the mean angular velocity as the gyro bias.
3. IF `accelG.z` at rest is not within 15% of +9.81 m/s², THEN THE SYSTEM SHALL tell the user the phone isn't face-up and level (or that the platform's sign convention is unverified) and SHALL NOT continue.

### Requirement 2 — Spin detection

**User Story:** As a student, I want the app to find each spin automatically, so that I just spin the phone.

#### Acceptance Criteria
1. THE SYSTEM SHALL resample gyro and accelerometer to a common uniform grid before analysis.
2. THE SYSTEM SHALL detect a spin as a segment where |ω_z| ≥ 6 rad/s for at least 1 s.
3. WHEN the out-of-plane angular velocity √(ωₓ² + ω_y²) exceeds 20% of |ω_z| for more than 30% of a spin, THE SYSTEM SHALL mark that spin as wobbling and exclude it.
4. IF ω_z shows a flat top for more than 100 ms (saturation), THEN THE SYSTEM SHALL warn "spin a little slower" and exclude the saturated samples.
5. THE SYSTEM SHALL ask for at least 3 accepted spins.

### Requirement 3 — Position estimation

**User Story:** As a student, I want to see where the sensor sits inside my phone, so that I learn how a = ω²r works.

#### Acceptance Criteria
1. THE SYSTEM SHALL estimate α = dω_z/dt from the low-pass-filtered ω_z.
2. THE SYSTEM SHALL estimate r = (rₓ, r_y) per spin by least squares over all samples with |ω_z| ≥ 6 rad/s, using aₓ = −ω² rₓ − α r_y and a_y = α rₓ − ω² r_y (full correction).
3. THE SYSTEM SHALL also compute the steady-segment estimate r = −a/ω² over samples with |α| ≤ 0.05·ω², and SHALL report it as a secondary value.
4. WHEN at least 3 spins are accepted, THE SYSTEM SHALL report the mean position, rejecting any spin more than 3 standard deviations from the median.
5. THE SYSTEM SHALL report the distances from the top and left edges using the outline inputs and the assumption that the spin axis is at the outline's centre.

**Property:** For any synthetic spin with r ∈ [0, 0.06] m in any direction, ω₀ ∈ [8, 30] rad/s, exponential spin decay with time constant ∈ [1, 10] s, accelerometer noise σ ∈ [0, 0.05] m/s², gyro noise σ ∈ [0, 0.01] rad/s and timing jitter ≤ 30%, the full-correction estimate recovers r within its reported uncertainty in at least 95% of cases.
**Property:** For a synthetic spin with constant ω (α = 0), the full-correction and steady-segment estimates agree within numerical tolerance.
**Property:** Rotating the synthetic sensor position by an angle φ in the phone plane rotates the estimate by φ (equivariance).

### Requirement 4 — Uncertainty and confidence

**User Story:** As a student, I want an honest uncertainty, so that I know how much to trust the dot.

#### Acceptance Criteria
1. THE SYSTEM SHALL compute per-spin standard errors from the least-squares fit residuals.
2. THE SYSTEM SHALL compute the standard error of the mean across spins, and SHALL report the larger of the two as the uncertainty of each coordinate.
3. THE SYSTEM SHALL report confidence `high` WHEN at least 3 spins agree within 5 mm and the mean |ω_z| ≥ 9 rad/s, `medium` WHEN 2 spins agree or the spread is 5–10 mm, and `low` otherwise.
4. IF the sampling jitter exceeds 30%, THEN THE SYSTEM SHALL lower confidence by one level and warn the user.
5. THE SYSTEM SHALL state that gyro errors count double: δr/r ≈ √((δa/a)² + (2δω/ω)²).

**Property:** Increasing the injected accelerometer noise never decreases the reported uncertainty (averaged over seeds).

### Requirement 5 — Reveal and explanation

**User Story:** As a judge or student, I want a memorable reveal with a plain explanation, so that I understand and remember the result.

#### Acceptance Criteria
1. WHEN the result is ready, THE SYSTEM SHALL draw the phone outline with a dot at the estimated position and a 95% uncertainty ellipse.
2. THE SYSTEM SHALL show the distances to the top and left edges in millimetres with uncertainty, e.g. "38 ± 3 mm below the top edge".
3. THE SYSTEM SHALL show the plain-language explanation: "Each spin pushes the sensor outward. How hard it's pushed, compared with how fast you spin, tells us how far it is from the centre."
4. WHERE reduced motion is enabled, THE SYSTEM SHALL show a static outline and dot without spin animation.
5. WHERE no phone is connected, THE SYSTEM SHALL run the experiment on a bundled spin trace (replay mode).

### Requirement 6 — Assumptions recorded

**User Story:** As an instructor, I want the assumptions stated, so that the lab report is scientifically honest.

#### Acceptance Criteria
1. THE SYSTEM SHALL list these assumptions in the result and the notebook: vertical spin axis fixed relative to the phone; spin axis ≈ centre of mass ≈ outline centre; no sliding/translation; accelerometer and gyroscope co-located on one IMU; gyro and accel samples time-aligned.
2. IF the least-squares residual RMS exceeds 30% of the mean centripetal acceleration, THEN THE SYSTEM SHALL warn that the phone probably slid or wobbled.
