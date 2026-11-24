# Lesson Plan: The Singing Ruler — Young's Modulus (40 Minutes)

## Overview & Curriculum Alignment
- **Grade Level**: 11–12 / Introductory Materials Science & AP Physics
- **Concept**: Cantilever vibration, material elasticity, acoustic Fourier spectrum analysis, and Young's modulus $E$.
- **Instrument**: Ruler clamped to desk edge, microphone acoustic spectrum via Séance (`/lab/singing-ruler` or `/hear`).

## Student Lab Roles
1. **The Conjuror**: Plucks the free end of the cantilever ruler with consistent deflection.
2. **The Scribe**: Measures ruler thickness $h \pm \Delta h$ (caliper) and overhang length $L \pm \Delta L$.
3. **The Sensor Warden**: Positions laptop/phone microphone within 5 cm of vibrating edge.
4. **The Skeptic**: Validates that FFT peak corresponds to fundamental mode $f_1$ rather than room noise or hand contact.

## 40-Minute Timeline
- **00:00 – 07:00 (Hook)**:
  - Twang a steel or wooden ruler at varying lengths. Why does pitch rise as length shortens?
  - Introduce Euler-Bernoulli cantilever frequency relation: $f_1 = \frac{3.516}{2\pi}\frac{h}{L^2}\sqrt{\frac{E}{12\rho}}$.
- **07:00 – 20:00 (Acoustic Capture)**:
  - Clamp ruler firmly at $L = 0.20 \pm 0.002$ m.
  - Record acoustic spectrum; identify resonance fundamental $f_1 \pm \Delta f$.
  - Compute Young's modulus $E$.
- **20:00 – 30:00 (Overhang Sweep)**:
  - Repeat for $L = 0.15$ m and $L = 0.25$ m; plot $\ln(f_1)$ vs $\ln(L)$ to verify inverse-square dependence.
- **30:00 – 37:00 (Séance Circle Aggregation)**:
  - Compare measured $E_{steel}$ or $E_{wood}$ across all lab benches on `/circle`.
  - Check whether class weighted mean matches reference ($E_{steel} \approx 200 \pm 10$ GPa).
- **37:00 – 40:00 (Conclusion)**:
  - Discuss how acoustic non-destructive testing inspects bridge beams and airplane wings.

## Safety Note
Clamp ruler securely to bench edge. Keep fingers clear of vibrating edge during acoustic twang.
