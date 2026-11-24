# Specification: Phase U8 — Skeptic's Séance ("Is This Room Haunted?")

## 1. Overview
Skeptic's Séance turns paranormal folklore into an empirical lesson in sensory physics. When people feel a room is "haunted," the cause is almost invariably unperceived environmental stimuli: low-frequency infrasound (1–20 Hz) causing eyeball resonance and hyperventilation, stroboscopic rolling-shutter light flicker from 50/60 Hz mains PWM, or acoustic reverberations. Skeptic's Séance provides rigorous environmental audits while strictly forbidding supernatural or unscientific claims.

## 2. Requirements & User Stories

### User Stories
- **US-1**: As an educator or student, I want to place my phone on the floor to measure 1–20 Hz infrasonic structural vibrations and transient shocks.
- **US-2**: As an investigator, I want to point my camera at indoor lighting to detect rolling-shutter spatial banding from mains flicker, clearly labelled qualitative.
- **US-3**: As a science communicator, I want a "Haunting Report" that maps strange feelings to cited peer-reviewed physical phenomena (e.g. 19 Hz ocular resonance) without claiming any paranormal detection.
- **US-4**: As a quality assurance guardian, I want an automated claim-guard mechanism that blocks forbidden claims ("ghost detected", "fully accessible", "structural safety certified", medical diagnoses).

### Acceptance Criteria & System Shall Clauses
1. **WHEN** analyzing floor vibrations **THE SYSTEM SHALL** filter accelerometer data to the 1–20 Hz band using biquad bandpass filtering and compute RMS energy compared against a quiet baseline.
2. **WHEN** inspecting room illumination **THE SYSTEM SHALL** average horizontal camera scanlines and compute spatial FFT to detect periodic rolling-shutter luminance banding, explicitly tagging the result as **qualitative**.
3. **WHEN** recording ambient acoustics **THE SYSTEM SHALL** request `{ autoGainControl: false, noiseSuppression: false, echoCancellation: false }` and present only relative dBFS levels without uncalibrated absolute SPL claims.
4. **WHEN** producing the Haunting Report **THE SYSTEM SHALL** formulate plain-language environmental explanations with cited physics principles and provide tactile visualization via the Smoked Drum.
5. **WHEN** generating UI or report text **THE SYSTEM SHALL** execute `validateClaimText` to block forbidden pseudoscientific, medical, and structural claims.

### Invariants (Properties)
- **Property 1 (Bandpass Attenuation)**: The 1–20 Hz bandpass filter shall attenuate out-of-band signals: a pure DC offset (0 Hz) and high-frequency noise (>= 50 Hz at 100 Hz fs) shall have energy attenuated by at least 12 dB relative to a 10 Hz in-band signal.
- **Property 2 (Claim Guard Enforcement)**: `validateClaimText` shall return `valid = false` with identified violations whenever input text contains forbidden phrases, and `valid = true` for compliant scientific reporting.
- **Property 3 (Qualitative Tagging)**: All optical rolling-shutter banding outputs shall retain an explicit `qualitative: true` property.
