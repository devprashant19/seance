# Requirements Spec: U5 Spirit Array

## 1. Overview
The Spirit Array coordinates multiple physical smartphones as a unified distributed instrument to measure normal modes, coupled resonances, and vibrational mode shapes in classroom physics settings.

## 2. Requirements & Invariants

### U5a: Multi-Device Synchronization & Resampling
- **WHEN** multiple spirits stream sensor data with differing clocks and rates, **THE SYSTEM SHALL**:
  - Bound clock skew $\Delta t_{skew} \ge \frac{1}{2} \min(RTT)$ from round-trip measurements.
  - Resample all active member channels to a common grid at $f_{s,\text{common}} = \min(\text{rates}, 50\text{ Hz})$ using linear interpolation.
  - **Property 1 (Skew Bound Invariant):** Reported clock skew uncertainty is never strictly below the physical bound implied by observed round-trip ping times ($\Delta t_{skew} \ge \frac{1}{2} \min(RTT)$).
  - **Property 2 (Graceful Member Dropout):** When a spirit disconnects or ceases streaming, its mood transitions to `fading` and array processing continues without throwing.

### U5b: Modal & Coupled Harmonic Analysis
- **WHEN** multi-channel synchronized oscillations are analyzed, **THE SYSTEM SHALL**:
  - Apply a Hann window and compute FFT spectra across all member channels.
  - Identify the shared resonant peak $f_0$ as the maximum of summed normalized spectral densities.
  - Compute member relative amplitudes $A_k / \max(A)$ and relative phases $\phi_k$.
  - Assign phase uncertainty $\phi_{err} = 360^\circ \cdot f_0 \cdot (\Delta t_{skew} / 1000)$.
  - **Property 3 (Delay & Phase Recovery Invariant):** For synthetic damped sinusoidal signals with delay $\tau$, recovered frequency matches within 2% and phase difference matches $360^\circ \cdot f \cdot \tau$ within stated $\phi_{err}$.
  - **Property 4 (Coupled Beat Period Property):** For coupled signals with normal modes $f_1 \ne f_2$, the recovered beat period $T_{beat} = 1 / |f_2 - f_1|$ matches envelope modulation.

### U5c: Experiments & Visualization
- **THE SYSTEM SHALL** register unified experiments:
  - `coupled-pendulums`: Two coupled pendulums ("The Tide") measuring $f_1, f_2$, and beat period $T_{beat}$.
  - `board-modes`: Multi-point wooden plank deflection measuring mode shape relative amplitudes and phase signs.
- **THE SYSTEM SHALL** provide `/array` route with multi-ink Smoked Drum seismograph and pulsing relative amplitude visuals.

### U5d: MCP Tools
- **THE SYSTEM SHALL** expose MCP tools:
  - `array_modes(tracePath)`: Computes shared frequencies, relative amplitudes, and phase uncertainties.
  - `check_sync_skew(room)`: Inspects clock skew distribution across active spirits.
