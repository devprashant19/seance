# Lesson Plan: Gravitational Acceleration via Pendulum Oscillation (40 Minutes)

## Overview & Curriculum Alignment
- **Grade Level**: 9–12 / Introductory College Physics
- **Concept**: Simple harmonic motion, small-angle approximation ($T = 2\pi\sqrt{L/g}$), and experimental error propagation.
- **Instrument**: Smartphone running Séance Poltergeist Lab (`/lab/pendulum-g` or `/hear` or `/gate`).

## Student Lab Roles (Groups of 3–4)
1. **The Conjuror**: Sets up the string suspension, measures physical string length $L$, and releases the pendulum bob from $< 15^\circ$ without pushing.
2. **The Sensor Warden**: Holds or positions the station phone, monitors gyroscope alignment, and checks for clipping/dropouts.
3. **The Scribe**: Records length $L \pm \Delta L$, observed period $T \pm \Delta T$, and logs the run to the Séance Circle teacher board.
4. **The Skeptic**: Checks for physical anomalies (string stretch, pivot friction, air drafts) and scrutinizes the oracle's verdict.

## 40-Minute Timeline
- **00:00 – 05:00 (Summoning)**: Hook & problem statement. How can a phone measure Earth's gravitational pull without moving across the planet?
- **05:00 – 12:00 (Calibration & Rig)**:
  - Measure length $L$ from pivot to phone center of mass ($L = 1.000 \pm 0.005$ m).
  - Verify device passport on `/bench` to ensure gyro bias is within tolerance.
- **12:00 – 25:00 (Runs & Data Capture)**:
  - Each team completes 3 trials of 10 complete oscillations.
  - Scribe inputs $L$ and observes calculated $g \pm \Delta g$.
  - Scribe submits final trial to the Séance Circle (`/circle`).
- **25:00 – 35:00 (Classroom Synthesis)**:
  - Teacher presents the Circle Results Board.
  - Compare sample mean vs inverse-variance weighted mean.
  - Identify any team flagged with an anomaly badge ($|g - \text{median}| > 3\cdot\text{MAD}$): Discuss why their result diverged (e.g., large initial angle $> 20^\circ$, pivot slip) without discarding their data.
- **35:00 – 40:00 (Banishing & Takeaway)**:
  - Final reflection: Why does weighting by $1/\sigma^2$ produce a more trustworthy consensus than a simple average?

## Safety Note
Ensure suspension pivot is securely clamped. Do not stand in the swing plane.
