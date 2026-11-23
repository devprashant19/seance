# Requirements Document — Avatars and Moods

## Introduction

`seance-avatars` renders every connected or replayed device ("spirit") as an original animated creature whose behaviour encodes real signal health. The Poltergeist mirrors a phone's orientation in 3D; moods (`calm`, `uneasy`, `restless`, `fading`) come from the `HealthReport` computed in `seance-core` and are always explained in plain language. A reduced-motion variant exists for every avatar. This spec also covers the landing → possession flow in `apps/poltergeist-lab` (the first 60 seconds of the judge path).

Glossary: **Spirit** — a device exposed through the `Spirit` interface. **Revenant** — a spirit replayed from a `.seance` trace. **Reference pose** — the phone orientation captured during the "Hold still" step.

## Requirements

### Requirement 1 — Live orientation mirroring

**User Story:** As a first-time visitor, I want the ghost on the laptop to move exactly like my phone, so that I instantly understand my phone is driving it.

#### Acceptance Criteria

1. WHEN an `orientation` batch arrives from a present poltergeist spirit, THE SYSTEM SHALL update the target ghost rotation within the same animation frame it is processed in.
2. WHEN the phone rotates by an angle φ about any axis after calibration, THE SYSTEM SHALL rotate the ghost by φ ± 10° about the corresponding on-screen axis (forward tilt, turn, roll as seen by a user facing the laptop).
3. WHILE the reference pose is not yet captured, THE SYSTEM SHALL use the first received orientation as a provisional reference and SHALL report the spirit as not calibrated.
4. THE SYSTEM SHALL compute ghost rotation as a unit quaternion and SHALL never produce NaN for any alpha ∈ [0, 2π), beta ∈ [−π, π), gamma ∈ [−π/2, π/2).
   **Property:** for all valid (alpha, beta, gamma), the output quaternion has norm 1 ± 1e-9 and no NaN components.
5. WHEN the phone is at the reference pose, THE SYSTEM SHALL show the ghost upright and facing the viewer.
   **Property:** `orientationToGhost(qRef, qRef)` equals the identity rotation within 1e-6.
6. WHEN alpha crosses the 0/2π boundary with other angles unchanged, THE SYSTEM SHALL produce no visible jump.
   **Property:** inputs differing only by alpha = 2π − ε vs alpha = ε produce rotations within 2ε (+1e-6) of each other, up to quaternion sign.
7. THE SYSTEM SHALL smooth the displayed rotation with a frame-rate-independent filter (time constant 40–80 ms) and SHALL clamp any single-frame target jump larger than 35°.
   **Property:** each smoothing step never increases the angular distance between the displayed and target rotation.

### Requirement 2 — Calibration ritual

**User Story:** As a visitor, I want a short "hold still" moment, so that the ghost is aligned to how I hold my phone and the gyroscope bias is known.

#### Acceptance Criteria

1. WHEN the tutorial reaches the *Hold still* step, THE SYSTEM SHALL fill a calibration ring over 2 s while the gyroscope magnitude stays below the stillness threshold defined in `seance-core`.
2. IF the phone moves above the stillness threshold during calibration, THEN THE SYSTEM SHALL drain the ring and show *Still… stiller…*.
3. WHEN the ring completes, THE SYSTEM SHALL store the averaged reference pose, the per-axis gyro bias, and mark the spirit calibrated.
4. WHEN calibration completes, THE SYSTEM SHALL display the measured gyro bias with its unit (rad/s).

### Requirement 3 — Moods encode signal health

**User Story:** As a student, I want the ghost's mood to tell me whether my data is trustworthy, so that the theme is information rather than decoration.

#### Acceptance Criteria

1. THE SYSTEM SHALL take the mood exclusively from `HealthReport.mood` produced by `seance-core` and SHALL NOT compute mood thresholds inside `seance-avatars`.
2. WHEN the mood becomes worse (calm → uneasy → restless → fading), THE SYSTEM SHALL apply it immediately.
3. WHEN the mood becomes calmer, THE SYSTEM SHALL apply it only after the calmer condition has held for 500 ms.
4. THE SYSTEM SHALL map each mood to visual parameters (glow, opacity, float, twitch, tremble, sparks, hue, badge icon) as defined in the design.
   **Property:** for moods ordered calm < uneasy < restless < fading, mean glow and opacity are non-increasing.
   **Property:** `moodVisuals` returns finite values for every possible `HealthReport`.
5. THE SYSTEM SHALL set lantern brightness to `clamp(rateHz / nominalRateHz, 0.2, 1.0)`.
6. WHEN the mood is `fading`, THE SYSTEM SHALL fade the ghost to ≤ 0.3 opacity within 600 ms and show a reconnect animation until data returns.

### Requirement 4 — Plain-language diagnostics

**User Story:** As any user, I want every spooky message explained, so that I am never confused.

#### Acceptance Criteria

1. THE SYSTEM SHALL show, for each mood, a spooky line and a plain-language line filled from `HealthReport` values (rate, jitter, dropouts, seconds without data).
2. THE SYSTEM SHALL make the mood tooltip reachable by mouse hover and by keyboard focus on the mood badge.
3. WHEN the mood changes, THE SYSTEM SHALL announce the plain-language line through an `aria-live="polite"` region at most once every 5 s.
4. THE SYSTEM SHALL indicate mood by icon shape and text label in addition to colour.

### Requirement 5 — Reduced motion and accessibility

**User Story:** As a user who is sensitive to motion or uses a screen reader, I want a calm variant, so that I can use Séance comfortably.

#### Acceptance Criteria

1. WHEN `prefers-reduced-motion: reduce` is set OR the user enables Calm mode, THE SYSTEM SHALL render every avatar as its static 2D variant without WebGL, particles, trails or float animation.
2. WHILE in Calm mode, THE SYSTEM SHALL show orientation as roll-only rotation (≤ 10 Hz updates) plus numeric readouts with units.
3. THE SYSTEM SHALL let keyboard users tilt the ghost with arrow keys when no live spirit is present.
4. THE SYSTEM SHALL provide text alternatives for each avatar (`role="img"` with a label naming the spirit and its mood).

### Requirement 6 — Landing and summoning flow

**User Story:** As a judge, I want to go from opening the link to the ghost moving in under 15 seconds with one tap on my phone, so that I am engaged immediately.

#### Acceptance Criteria

1. WHEN the landing page loads and the relay is connected, THE SYSTEM SHALL display a QR code of at least 280 CSS px and the room code before any 3D asset is downloaded.
2. IF the relay is not connected within 2 s, THEN THE SYSTEM SHALL hide the QR code, explain the problem in plain language, offer a recorded haunting, and retry every 5 s.
3. WHEN the first spirit becomes `present`, THE SYSTEM SHALL play the summoning transition (≤ 1.5 s, skipped in Calm mode) and then show the live ghost.
4. WHEN the ghost is live, THE SYSTEM SHALL run the tutorial *Tilt me* → *Shake me* (showing peak acceleration in m/s²) → *Hold still*, each skippable.
5. WHEN calibration completes or the tutorial is skipped, THE SYSTEM SHALL show two doors: Poltergeist Lab and Banshee Choir; the Choir door SHALL carry the room code.
6. THE SYSTEM SHALL offer "No phone? Watch a recorded haunting" that starts a Revenant replay within 3 s of the click.
7. WHILE no live spirit is present, THE SYSTEM SHALL let mouse drag (yaw/pitch, Shift = roll) rotate the ghost.

### Requirement 7 — Failure states

**User Story:** As a visitor whose setup is unusual, I want a clear message and next step, so that I never face a blank screen.

#### Acceptance Criteria

1. IF motion permission is denied on the phone, THEN THE SYSTEM SHALL explain how to retry and offer a *Try again* button that re-requests permission inside the tap.
2. IF no motion events arrive within 1 s after the Begin tap, THEN THE SYSTEM SHALL tell the user the device has no motion sensors and suggest scanning with a phone.
3. IF the page is not a secure context, THEN THE SYSTEM SHALL tell the user to open the link over HTTPS in Safari or Chrome.
4. IF the landing page is opened on a phone without a room code, THEN THE SYSTEM SHALL suggest a laptop and offer phone-only mode using the local transport.
5. IF Screen Wake Lock is unavailable, THEN THE SYSTEM SHALL show a persistent "keep this screen on" hint on the phone.

### Requirement 8 — Performance

**User Story:** As a judge on an ordinary laptop, I want smooth animation, so that the experience feels polished.

#### Acceptance Criteria

1. WHILE one live spirit is displayed, THE SYSTEM SHALL sustain ≥ 55 fps on a mid-range laptop with ≤ 4 ms of avatar JavaScript per frame.
2. THE SYSTEM SHALL not allocate objects or trigger React re-renders per sample; re-renders happen only on mood or state changes.
3. IF the average frame time exceeds 25 ms for 2 s, THEN THE SYSTEM SHALL disable the trail and sparks, and IF it remains above 25 ms, switch to the 2D variant with a short notice.
4. WHILE the tab is hidden, THE SYSTEM SHALL pause rendering.

### Requirement 9 — Revenants and placeholder spirits

**User Story:** As a developer, I want every spirit kind to render something sensible, so that new transports never crash the UI.

#### Acceptance Criteria

1. WHEN a spirit comes from the replay transport, THE SYSTEM SHALL render it as a Revenant: the underlying avatar at 45% opacity, desaturated, labelled with the recording timestamp and device.
2. THE SYSTEM SHALL provide placeholder 2D avatars for `banshee`, `watcher`, `golem`, `wisp` and `organist`.
3. IF a spirit kind is unknown, THEN THE SYSTEM SHALL render a neutral orb with the spirit label and SHALL NOT throw.
4. THE SYSTEM SHALL use original artwork only.
