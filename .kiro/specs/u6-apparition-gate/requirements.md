# Specification: Phase U6 — Apparition Gate (Camera Spirit)

## 1. Overview
The Apparition Gate transforms a laptop or phone webcam into a contactless optical photogate and stroboscopic timing instrument. It runs 100% in-browser with no cloud processing, works laptop-only with no phone required, and obeys physical error propagation and Nyquist sampling laws.

## 2. Requirements & User Stories

### User Stories
- **US-1**: As a student, I want to use my laptop webcam as a photogate to measure pendulum periods without attaching any phone to the string.
- **US-2**: As a physics learner, I want to roll a marble or drop an object past two screen regions to measure speed with accurate physical uncertainty.
- **US-3**: As a lab instructor, I want an optical RPM tachometer that visibly flags stroboscopic/Nyquist aliasing when a fan spins faster than half the camera frame rate.

### Acceptance Criteria & System Shall Clauses
1. **WHEN** the webcam starts **THE SYSTEM SHALL** acquire frames via `getUserMedia({ video: true })` and draw to an internal downsampled canvas (`OffscreenCanvas` or hidden canvas).
2. **WHEN** measuring frame timestamps **THE SYSTEM SHALL** use `requestVideoFrameCallback` metadata if available, and fall back to `performance.now()` with wider timing uncertainty.
3. **WHEN** tracking regions of interest (ROI 1 and ROI 2) **THE SYSTEM SHALL** compute mean brightness difference from a hold-still baseline ($\Delta b = |b - b_0|$).
4. **WHEN** an object interrupts the beam **THE SYSTEM SHALL** trigger crossing hysteresis ($|b - b_0| > k \cdot \sigma_0$ to activate, $< (k/2) \cdot \sigma_0$ to deactivate) and compute sub-frame crossing times via linear interpolation.
5. **WHEN** calculating pendulum period **THE SYSTEM SHALL** compute period from successive same-direction crossings with total-time uncertainty $\sigma_T \approx \sqrt{2} \sigma_t / N$.
6. **WHEN** calculating speed across two gates **THE SYSTEM SHALL** compute $v = d / \Delta t$ and propagate error $\sigma_v = v \cdot \sqrt{(\sigma_d / d)^2 + (\sigma_{\Delta t} / \Delta t)^2}$.
7. **WHEN** measuring blade/fan frequency **THE SYSTEM SHALL** perform spectral peak detection and flag aliasing whenever the detected or expected frequency exceeds $\text{fps} / 2$.

### Invariants (Properties)
- **Property 1 (Timing Uncertainty Bound)**: The event timing uncertainty $\sigma_t$ shall be bounded below by the single-frame quantization limit $\frac{\Delta t_{frame}}{\sqrt{12}} = \frac{1}{\text{fps} \cdot \sqrt{12}}$.
- **Property 2 (Period Reconstruction Precision)**: Given synthetic crossing events at known period $T$ sampled at random frame rates 24–60 fps, the reconstructed period shall match $T$ within $3 \sigma_T$.
- **Property 3 (Nyquist Aliasing Detection)**: `computeGateRpm` shall set `isAliased = true` whenever $f_{signal} > \text{fps} / 2$.
- **Property 4 (Speed Error Propagation)**: Speed $v = d / \Delta t$ and its uncertainty $\sigma_v$ shall strictly satisfy the non-linear Gaussian propagation invariant $\sigma_v = v \cdot \sqrt{(\sigma_d/d)^2 + (\sigma_{\Delta t}/\Delta t)^2}$.
