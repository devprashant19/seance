# Implementation Plan — Avatars and Moods

- [x] 1. Create the `seance-avatars` package
  - [x] Workspace package with React, three.js, `@react-three/fiber`, Framer Motion as peer/deps; single public `index.ts`
  - [x] Import only from `seance-core`'s public entry
  - _Requirements: 9.2, 9.3_

- [x] 2. Orientation maths (pure)
- [x] 2.1 Implement `deviceOrientationToQuaternion` and `earthToWorld`
  - Intrinsic Z–X′–Y″, radians in, Hamilton quaternions; −90° about x for earth → three world
  - _Requirements: 1.4_
- [x]* 2.2 Property tests: unit norm + finite outputs over the full angle ranges (P-AV-1)
  - _Requirements: 1.4_
- [x] 2.3 Implement `captureReference` and `headingNormaliser`
  - Sign-aligned quaternion mean; forward vector = device y, or −z when y is within 45° of vertical
  - _Requirements: 1.2, 1.5, 2.3_
- [x]* 2.4 Property tests: identity at reference (P-AV-2); pure yaw maps to rotation about +y; alpha wrap-around continuity (P-AV-3)
  - _Requirements: 1.5, 1.6_
- [x] 2.5 Implement `smoothStep` (frame-rate-independent slerp, shortest arc, 35° spike clamp)
  - _Requirements: 1.7_
- [x]* 2.6 Property test: smoothing never increases distance to target (P-AV-4)
  - _Requirements: 1.7_

- [x] 3. Mood visuals
- [x] 3.1 Implement `moodVisuals(mood, health)` per the design table, including lantern = clamp(rate/nominal, 0.2, 1)
  - _Requirements: 3.4, 3.5_
- [x] 3.2 Implement `useMoodWithHysteresis` (worse immediately, calmer after 500 ms)
  - _Requirements: 3.2, 3.3_
- [x]* 3.3 Property tests: monotonic glow/opacity by mood order (P-AV-5); totality (P-AV-6)
  - _Requirements: 3.4_
- [x] 3.4 Unit tests for hysteresis timing with fake timers
  - _Requirements: 3.2, 3.3_

- [x] 4. Badges, tooltips and copy
- [x] 4.1 `MoodBadge` with icon shape + label + colour; keyboard-focusable tooltip
  - _Requirements: 4.2, 4.4_
- [x] 4.2 Copy deck `{ spooky, plain }` for every mood and tutorial/door/failure string; test that every key has both
  - _Requirements: 4.1_
- [x] 4.3 `aria-live` mood announcements, throttled to one per 5 s
  - _Requirements: 4.3_

- [x] 5. Poltergeist 3D
- [x] 5.1 Cloth-sheet mesh, hem-wobble vertex shader, fresnel rim, lantern core with one point light
  - _Requirements: 1.1, 3.4, 9.4_
- [x] 5.2 Bind orientation via refs inside `useFrame`; no per-sample React state
  - _Requirements: 1.1, 8.2_
- [x] 5.3 Shake response (high-passed |accel| → spring-damped jitter, rattling plates)
  - _Requirements: 6.4_
- [x] 5.4 Mood uniforms: glow, hue, wobble speed, twitch, tremble, sparks (restless only), fading opacity + reconnect pulse
  - _Requirements: 3.4, 3.6_
- [ ]* 5.5 Ectoplasm trail (pre-allocated ribbon, 48 points, fades in 0.8 s; visual stretch)
  - _Requirements: 8.2_
- [x] 5.6 Mouse-drag and arrow-key tilt when no live spirit is present
  - _Requirements: 5.3, 6.7_

- [x] 6. Reduced motion and fallbacks
- [x] 6.1 `useReducedMotion` (media query OR Calm-mode toggle persisted in localStorage with try/catch)
  - _Requirements: 5.1_
- [x] 6.2 `PoltergeistFlat` SVG: roll-only rotation at ≤ 10 Hz + numeric readouts
  - _Requirements: 5.2, 5.4_
- [x] 6.3 Frame-time guard: disable trail/sparks, then switch to 2D with a toast
  - _Requirements: 8.3_
- [x] 6.4 Pause rendering when the tab is hidden
  - _Requirements: 8.4_

- [x] 7. Revenant and placeholders
- [x] 7.1 `Revenant` wrapper (45% opacity, desaturated, timestamp + device label)
  - _Requirements: 9.1_
- [x] 7.2 Placeholder SVGs for banshee, watcher, golem, wisp, organist; neutral orb for unknown kinds
  - _Requirements: 9.2, 9.3_

- [ ] 8. Landing route (poltergeist-lab)
- [ ] 8.1 Candles, summoning circle, QR (≥ 280 px) + room code rendered before the three.js chunk loads
  - _Requirements: 6.1_
- [ ] 8.2 Relay-down state: hide QR, explain, offer replay, auto-retry every 5 s
  - _Requirements: 6.2_
- [ ] 8.3 "No phone? Watch a recorded haunting" → Revenant within 3 s
  - _Requirements: 6.6_
- [ ] 8.4 Phone-opened-landing detection → laptop suggestion + phone-only mode
  - _Requirements: 7.4_

- [ ] 9. Possession route (poltergeist-lab)
- [ ] 9.1 Summoning transition (≤ 1.5 s; instant in Calm mode)
  - _Requirements: 6.3_
- [ ] 9.2 Tutorial state machine: Tilt → Shake (peak m/s²) → Hold still (calibration ring) → Doors; skippable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.4, 6.5_
- [ ] 9.3 Doors to Lab and Choir (room code carried); "Ghost of a past visitor" drawer with a bundled trace
  - _Requirements: 6.5, 9.1_
- [ ] 9.4 Phone-side failure copy: permission denied + retry, no sensors, insecure context, wake-lock hint (coordinate with phone-bridge join page)
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 10. Verification
- [ ] 10.1 Fixture replay tests: calm / jittery / dropout traces produce the expected mood sequences
  - _Requirements: 3.1, 3.2, 3.3, 3.6_
- [ ]* 10.2 Playwright: QR before three.js chunk; replay within 3 s; reduced-motion renders no canvas (deferred to K6)
  - _Requirements: 5.1, 6.1, 6.6_
- [ ] 10.3 Performance trace ≥ 55 fps for 60 s with one live spirit; save screenshot to `docs/evidence/` (scheduled for K5)
  - _Requirements: 8.1_
- [ ] 10.4 Hallway test with 3 strangers (< 15 s each, zero help); results in `docs/hallway-tests.md` (scheduled for K6)
  - _Requirements: 6.1, 6.3, 6.4_
