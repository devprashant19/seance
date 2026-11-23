# Implementation Plan — Banshee Choir

- [ ] 1. App scaffold and joining
- [ ] 1.1 Create `apps/banshee-choir` (Vite + React, port 5174) importing only `seance-core` / `seance-avatars` entry points
  - _Requirements: 1.1, 1.2_
- [ ] 1.2 Join an existing room from `?room=CODE`, or create one and show the summoning circle + QR
  - _Requirements: 1.1, 1.2_
- [ ] 1.3 `ChoirSession`: voice per present spirit, preset/colour/stage slot assignment, audience ghosts beyond 8
  - _Requirements: 1.3, 1.5_
- [ ] 1.4 Neutral-tilt capture prompt per new voice (1 s), double-tap re-centre
  - _Requirements: 1.4_

- [x] 2. Audio unlock
- [x] 2.1 Create/resume AudioContext in the door click or the "Let the banshees sing" button; overlay while suspended; re-check on visibility change
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Pure mapping functions
- [x] 3.1 `SCALES`, `scaleFrequencies` (D3 root, two octaves, equal temperament)
  - _Requirements: 3.2, 3.5_
- [x] 3.2 `tiltToPosition` and `snapToScale` with 0.15 hysteresis
  - _Requirements: 3.1, 3.3_
- [x]* 3.3 Property tests P-CH-1 … P-CH-4
  - _Requirements: 3.1, 3.2, 3.3_
- [x] 3.4 `rollToCutoff`, `shakeEnvelope`, `shakeToTremolo`
  - _Requirements: 4.1, 4.2, 4.3_
- [x]* 3.5 Property tests P-CH-5 … P-CH-7
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Voice graph and master bus
- [x] 4.1 `createVoice`: 2 oscillators + vibrato, formant pair (oo/ah/ee presets), low-pass, tremolo, gate, panner
  - _Requirements: 3.4, 4.1, 4.3, 5.1_
- [x] 4.2 `createMasterBus`: 1/√N sum, synthesized reverb send (≤ 0.25 wet), limiter, master ≤ 0.9, analyser
  - _Requirements: 6.1, 6.2_
- [x] 4.3 Voice lifecycle: release tail on leave/fade, dispose disconnects all nodes
  - _Requirements: 5.3, 7.3_
- [x] 4.4 OfflineAudioContext test: 4 voices + 4 loops at full volume peak < 0 dBFS
  - _Requirements: 6.3_

- [x] 5. Instrument
- [x] 5.1 `defineInstrument` banshee voice: `map()` pure, `apply()` via setTargetAtTime only, ≤ 60 Hz updates
  - _Requirements: 3.4, 7.3_
- [x] 5.2 Gate from `control.touch`; drone mode (gain = 0.15 + 0.85·s); fallback to drone when no touch channel
  - _Requirements: 5.1, 5.2_

- [x] 6. Stage
- [x] 6.1 `Singer` avatar per voice (mouth = envelope, glow/badge = mood, colour + name); Revenant singers with loop-progress ring
  - _Requirements: 9.1, 9.2_
- [x] 6.2 Controls: scale, tempo, master volume, per-voice mute — keyboard accessible
  - _Requirements: 3.5, 9.3_
- [x] 6.3 Reduced motion: static avatars, numeric level, numeric beat counter
  - _Requirements: 9.4_
- [x] 6.4 Laptop-only: recorded séance (bundled `demo` traces) + keyboard-played voice
  - _Requirements: 9.5_

- [x] 7. Ghost Looper
- [x] 7.1 `BarClock` on the AudioContext timeline; visual beat; synthesized count-in clicks
  - _Requirements: 8.1, 8.2_
- [x] 7.2 Arm → record on next bar → stop at loop end; capture apply-time control lane as a GhostTrace
  - _Requirements: 8.2, 8.3_
- [x] 7.3 Lookahead scheduler (25 ms / 100 ms) + replay transport loop playback as a Revenant voice, re-anchored per iteration
  - _Requirements: 8.4_
- [x]* 7.4 Property tests P-CH-8, P-CH-9
  - _Requirements: 8.4_
- [x] 7.5 Up to 4 loops with mute/delete; scale change re-harmonises loops
  - _Requirements: 8.5, 8.6_

- [ ] 8. Validation
- [ ] 8.1 Record AudioContext latencies + motion→sound latency in `docs/choir-validation.md` (scheduled for K5/K6)
  - _Requirements: 7.1, 7.2_
- [ ] 8.2 3-phone, 2-minute jam: no fading events, ≤ 0.5% dropped samples per phone (needs 3 real phones)
  - _Requirements: 7.4_
- [ ] 8.3 Loop sync tests: grid error ≤ 5 ms over 8 iterations; tap-on-the-beat within ±30 ms (needs live test)
  - _Requirements: 8.4_
- [ ] 8.4 Record the backup video (phase-06 checklist) and tag `v0.6-valid-submission` (scheduled for K7)
  - _Requirements: 1.1, 8.4_
