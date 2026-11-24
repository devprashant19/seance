# Requirements Spec: U3 Ghost Ear Complete & User Study

## 1. Overview
Ghost Ear Complete extends the audio-first accessible physics laboratory across all supported experiments (`pendulum-g`, `free-fall`, `singing-ruler`, `spin-find-chip`), adds Darkroom mode for low-vision environments, implements multi-modal feedback (haptics + earcons), and defines an empirical user study protocol.

## 2. Requirements & Invariants

### U3a: Multi-Experiment Sonification
- **WHEN** `free-fall` is sonified, **THE SYSTEM SHALL** render the free-fall window as dead silence, play a dropout/thud earcon on impact, and speak the calculated fall height ($h \pm \sigma_h$).
- **WHEN** `singing-ruler` is sonified, **THE SYSTEM SHALL** synthesize an oscillator at the measured fundamental frequency $f_1$, and speak $f_1 \pm \sigma$ and Young's Modulus $E \pm \sigma_E$.
- **WHEN** `spin-find-chip` is sonified, **THE SYSTEM SHALL** speak the radial offset in centimetres ($r \pm \sigma$) along with direction guidance.

### U3b: Darkroom & Multi-Modal Feedback
- **WHEN** Darkroom mode is enabled, **THE SYSTEM SHALL** render the UI in total pitch-black background with high-contrast text (#ffffff / #000000), persisting state across sessions via `localStorage`.
- **WHEN** a waveform peak or zero crossing occurs:
  - If `navigator.vibrate` is available, trigger a 15 ms haptic pulse.
  - If haptics are unsupported (iOS / Desktop), play an audio click tick earcon.

### U3c: Study Protocol
- **THE SYSTEM SHALL** define a reproducible study protocol in `docs/studies/ghost-ear-study.md` covering:
  - IRB-aligned consent script,
  - 3 standardized identification tasks,
  - Objective timing and error metrics,
  - Qualitative co-design feedback from blind/low-vision participants.
