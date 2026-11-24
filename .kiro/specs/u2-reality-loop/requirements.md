# Requirements Spec: U2 Reality Loop

## 1. Overview
The Reality Loop keeps the Séance software honest by anchoring software models in physical device observations:
- Device Passports ("WraithBench") measure real sensor capabilities, jitter, still-window noise floors, and gyro biases.
- Calibration Rituals guide users through invariant checks (flat, upright, rotate 90°, swing) with real-time feedback and an `instruct` protocol message.
- Event Triggers ("Trace Trigger") detect physical transient events (knocks, drops, steps) via median-absolute-deviation (MAD) energy detection, slicing pre/post event windows into regression tests.
- Tribunal Audits inspect signal claims against physical artifacts (clipping, rate drops, timestamps jitter).
- MCP Tools expose passports, device profile comparison, event extraction, and instruction dispatch to AI agents and developers.

## 2. Requirements & Invariants

### U2a: Device Passport ("WraithBench")
- **WHEN** sensor capability is queried, **THE SYSTEM SHALL** report secure context, available channels, permission states, and reported sampling intervals.
  - **Property 1 (Capability Subset Invariant):** Capability reporting is valid for any subset of active or supported channels without throwing.
- **WHEN** passport stats are computed on a trace channel, **THE SYSTEM SHALL** calculate:
  - Sampling frequency $f_s = 1000 / \text{median}(\Delta t)$,
  - Jitter coefficient of variation $CV = 100 \cdot \sigma(\Delta t) / \text{mean}(\Delta t)$,
  - Dropouts where $\Delta t > 3 \cdot \text{median}(\Delta t)$,
  - Still-window mean, $\sigma$, and gyro bias $\bar{\omega}$ when $|a| - 9.81$ std $< 0.05\text{ m/s}^2$ over $\ge 3\text{ s}$.
  - **Property 2 (Time Shift Invariance):** Passport sampling stats ($f_s, CV$, dropout count) are strictly invariant to any constant timestamp offset $t' = t + c$.
  - **Property 3 (Non-negativity):** $f_s \ge 0$, $CV \ge 0$, and dropout counts are non-negative integers.
- **WHEN** two passports are compared against tolerance bounds, **THE SYSTEM SHALL** issue a verdict of `pass | drift | fail` with explanatory reasons.
  - **Property 4 (Identical Baseline Invariance):** Comparing a passport to itself yields zero diff and verdict `pass`.

### U2b: Calibration Ritual & Protocol Extension
- **WHEN** a calibration ritual is executed, **THE SYSTEM SHALL** verify:
  1. Flat state: $a_g \approx (0, 0, \pm 9.81)\text{ m/s}^2$.
  2. Upright state: gravity component dominantly on $y$.
  3. 90-degree rotation: $\int \omega_z dt \approx \pm \pi/2\text{ rad}$.
  4. Swing: periodic gyro signal with stable estimated period.
- **WHEN** an observer or host sends an `instruct` message, **THE SYSTEM SHALL** validate:
  - Role must be `host` or `observer`.
  - Destination `to` peer must exist in room.
  - Text length $\le 200$ characters.
  - Rate limited to maximum 1 message per second per peer.
  - **Property 5 (Instruct Rejection):** Payloads $> 200$ chars, invalid sender roles, or rates $> 1/\text{s}$ are rejected with error messages.

### U2c: Event Trigger & Windowing
- **WHEN** a continuous acceleration stream is monitored, **THE SYSTEM SHALL** compute energy $e[n]$ as high-passed $|a|^2$ over 50 ms frames and baseline median $m$ and $MAD = \text{median}(|e - m|)$.
- **WHEN** $(e[n] - m) / (1.4826 \cdot MAD + \epsilon) > \tau$ ($\tau = 6$) for $k = 2$ consecutive frames outside a 1 s refractory period, **THE SYSTEM SHALL** fire an event trigger.
  - **Property 6 (Deterministic Triggering):** An identical replay of a trace fires at exactly the same sample index.
- **WHEN** an event is triggered, **THE SYSTEM SHALL** extract a fixed pre/post window (0.5 s pre, 1.5 s post, 2.0 s total).
  - **Property 7 (Constant Window Length):** For any event index sufficiently far from boundaries, the extracted window duration equals exactly 2.0 s.

### U2d: Tribunal Audit
- **WHEN** a trace is audited, **THE SYSTEM SHALL** evaluate robust statistics:
  - Median and MAD on all channels,
  - Sampling gaps ($\Delta t > 3 \cdot \text{median}(\Delta t)$),
  - Clipping events (samples at reported sensor maximum for $\ge 3$ consecutive frames).
  - **Property 8 (Gap Detection Invariant):** Synthetically injected timestamp gaps are always detected; perfectly uniform sampling never flags gap artifacts.

### MCP Tools
- **THE SYSTEM SHALL** register MCP tools:
  - `sensor_passport(tracePath | spirit)`
  - `compare_device_profiles(baselinePath, samplePath)`
  - `extract_event_window(tracePath, tMs)`
  - `instruct(spiritId, text)`
