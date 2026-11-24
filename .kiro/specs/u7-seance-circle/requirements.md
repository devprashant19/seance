# Specification: Phase U7 — Séance Circle (Classroom Mode)

## 1. Overview
Séance Circle allows a single smartphone (or a small set of station phones) to serve an entire science classroom. Teams take turns running experiments at stations; their measurements with physical uncertainties are aggregated onto a central teacher results board (`/circle`). The board computes class statistics, detects outliers without censoring them, and exports clean CSV and Jupyter analysis notebooks.

## 2. Requirements & User Stories

### User Stories
- **US-1**: As a physics teacher, I want to create a named classroom Circle with team slots so that all student lab groups can submit measurements to a shared board.
- **US-2**: As a student group, I want our team's measurement and uncertainty displayed alongside the class distribution with visual error bars.
- **US-3**: As an educator, I want the system to compute the inverse-variance weighted mean, sample standard deviation, and median, while flagging anomalous outliers ($|x - \text{median}| > 3 \cdot \text{MAD}$) without ever deleting them.
- **US-4**: As a science curriculum director, I want 40-minute turnkey lesson scripts for pendulum-g, free-fall, and singing-ruler with clear student role divisions.

### Acceptance Criteria & System Shall Clauses
1. **WHEN** teams record runs **THE SYSTEM SHALL** tag each result with `{ circleId, team, station, experiment, timestamp }`.
2. **WHEN** aggregating results **THE SYSTEM SHALL** compute:
   - Median and MAD (Median Absolute Deviation)
   - Sample mean and standard deviation ($s = \sqrt{\frac{1}{N-1}\sum (x_i - \bar{x})^2}$)
   - Inverse-variance weighted mean $\bar{x}_w = \frac{\sum w_i x_i}{\sum w_i}$ with $w_i = \frac{1}{\sigma_i^2}$
   - Combined weighted uncertainty $\sigma_w = \frac{1}{\sqrt{\sum w_i}}$
3. **WHEN** an observation exceeds 3 MAD from the median ($|x_i - \text{median}| > 3 \cdot \text{MAD}$) **THE SYSTEM SHALL** display an anomaly badge and retain the observation in the dataset.
4. **WHEN** exporting classroom data **THE SYSTEM SHALL** produce RFC 4180 compliant CSV files and standard `.ipynb` Jupyter notebooks with Python analysis code.
5. **WHEN** running without internet or phones **THE SYSTEM SHALL** provide pre-populated demonstration replay datasets.

### Invariants (Properties)
- **Property 1 (Permutation Invariance)**: For any arbitrary reordering of team results, the computed median, mean, sample standard deviation, weighted mean, and weighted uncertainty shall be identical.
- **Property 2 (Weighted Uncertainty Bound)**: For any set of measurements with non-zero uncertainties $\sigma_i$, the inverse-variance weighted uncertainty $\sigma_w = \frac{1}{\sqrt{\sum \frac{1}{\sigma_i^2}}}$ shall be strictly less than or equal to the minimum individual uncertainty: $\sigma_w \le \min_i(\sigma_i)$.
- **Property 3 (Isolation of Team Entries)**: Updating or adding a result for team $A$ shall never modify or mutate the stored measurements of team $B$.
