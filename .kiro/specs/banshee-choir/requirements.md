# Requirements Document — Banshee Choir

## Introduction

Banshee Choir (`apps/banshee-choir`) is App 2 of the Séance skeleton: a multiplayer motion-to-music instrument. Each phone in a room becomes a ghostly synthesized voice controlled by tilt (pitch, snapped to a scale), roll (brightness), shake (tremolo) and touch (sing). The laptop is the stage and the only sound source. The Ghost Looper records a take as motion and replays it, in time, as a translucent Revenant singer. The app uses only the public entry points of `seance-core` and `seance-avatars`.

All audio is synthesized with the Web Audio API; no samples or recordings are used.

## Requirements

### Requirement 1 — Joining the choir

**User Story:** As a judge, I want my phone to become a voice in seconds, so that I can play immediately and pull others in.

#### Acceptance Criteria

1. WHEN the Choir opens with `?room=CODE`, THE SYSTEM SHALL join that room as a display and create a voice for every present phone spirit.
2. WHEN the Choir is opened without a room code, THE SYSTEM SHALL create a room and show the summoning circle with a QR code and room code.
3. WHEN a phone joins a Choir room, THE SYSTEM SHALL assign it the next free voice preset, colour and stage position, and show its singing avatar within 1 s.
4. WHEN a voice is created, THE SYSTEM SHALL capture the phone's neutral tilt over 1 s with the prompt "Hold your phone comfortably — that's your middle note".
5. IF more than 8 phones are present, THEN THE SYSTEM SHALL show additional phones as audience ghosts without voices and say so.

### Requirement 2 — Audio unlock

**User Story:** As a user, I want sound to start reliably, so that the choir never appears broken.

#### Acceptance Criteria

1. THE SYSTEM SHALL create or resume the AudioContext only inside a user gesture (the door click or the "Let the banshees sing" button).
2. WHILE the AudioContext is suspended, THE SYSTEM SHALL show an overlay with the unlock button.
3. WHEN the tab becomes visible again, THE SYSTEM SHALL re-check the AudioContext state and show the overlay if it is suspended.

### Requirement 3 — Pitch from tilt

**User Story:** As a player, I want tilting my phone to change pitch on a pleasant scale, so that the choir always sounds good.

#### Acceptance Criteria

1. THE SYSTEM SHALL map front–back tilt (orientation beta relative to neutral, clamped to ±50°) to a position in [0, 1].
   **Property:** position is within [0, 1] for every finite tilt value.
2. THE SYSTEM SHALL map position to a note of the selected scale spanning two octaves from the room root (default D3 = 146.83 Hz) in equal temperament.
   **Property:** the output frequency always equals one of the selected scale's frequencies.
3. THE SYSTEM SHALL change note only when the continuous note index differs from the current note by more than 0.65.
   **Property:** for any continuous index within 0.65 of the current note, the note does not change.
   **Property:** for a monotonically increasing input sweep, the output note never decreases.
4. THE SYSTEM SHALL glide between notes with a 20 ms time constant.
5. THE SYSTEM SHALL offer the scales Graveyard (0, 3, 5, 7, 10), Crypt (0, 1, 3, 5, 7, 8, 10) and Fog (0, 2, 4, 6, 8, 10), selectable at any time.

### Requirement 4 — Timbre and expression

**User Story:** As a player, I want roll and shake to change the sound, so that I can express myself with movement.

#### Acceptance Criteria

1. THE SYSTEM SHALL map roll (gamma relative to neutral, clamped to ±60°) to a low-pass cutoff of 300 · 20^r Hz for r ∈ [0, 1].
   **Property:** cutoff is monotonic in roll and always within [300, 6000] Hz.
2. THE SYSTEM SHALL compute a shake envelope from gravity-free acceleration magnitude (noise floor 0.3 m/s², attack 10 ms, release 300 ms) normalised to s ∈ [0, 1] at 12 m/s².
   **Property:** s is always within [0, 1] and the envelope is never negative.
3. THE SYSTEM SHALL set tremolo depth to 0.8 · s and tremolo rate to 4 + 5 · s Hz.
   **Property:** tremolo depth and rate are monotonic in s.

### Requirement 5 — Gate and drone mode

**User Story:** As a player, I want to choose when my banshee sings, so that the choir isn't a constant drone.

#### Acceptance Criteria

1. WHILE a finger is on the phone's touch pad, THE SYSTEM SHALL open the voice gate with a ~45 ms attack, and WHEN the finger lifts, close it with a ~360 ms release.
2. WHERE drone mode is enabled, THE SYSTEM SHALL keep the gate open and set voice gain to 0.15 + 0.85 · s.
3. IF a phone's spirit fades (no data for more than 1 s), THEN THE SYSTEM SHALL close that voice's gate with the release curve.

### Requirement 6 — Master bus safety

**User Story:** As a listener, I want the sound to stay clean however many people play, so that it never distorts or hurts.

#### Acceptance Criteria

1. THE SYSTEM SHALL route all voices through a sum gain of 1/√(number of active voices), a synthesized reverb send (wet ≤ 0.25), a limiter (threshold −6 dB, ratio 20, attack 3 ms, release 100 ms) and a master gain capped at 0.9.
2. THE SYSTEM SHALL never bypass the limiter.
3. WHILE 4 live voices and 4 loops play at full volume, THE SYSTEM SHALL keep the output peak below 0 dBFS.

### Requirement 7 — Latency and stability

**User Story:** As a player, I want the sound to follow my motion closely, so that it feels like an instrument.

#### Acceptance Criteria

1. THE SYSTEM SHALL create the AudioContext with the interactive latency hint and record its reported latencies.
2. THE SYSTEM SHALL keep motion-to-sound latency at or below 200 ms on the target network.
3. THE SYSTEM SHALL update audio parameters only through scheduled automation (setTargetAtTime / setValueAtTime) at most 60 times per second per voice and SHALL not rewire a sounding voice's graph.
4. WHILE 3 phones play for 2 minutes, THE SYSTEM SHALL record no fading events and at most 0.5% dropped samples per phone.

### Requirement 8 — Ghost Looper

**User Story:** As a player, I want to loop what I just sang, so that I can build a layered spooky performance.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep a musical clock on the AudioContext timeline with tempo (default 90 BPM), 4/4 time and loop lengths of 1, 2 or 4 bars.
2. WHEN a voice is armed, THE SYSTEM SHALL count in for one bar, start recording at the next bar boundary and stop after the loop length.
3. THE SYSTEM SHALL record the voice's control channels timestamped at the time they were applied to the audio graph, and store the take as a ghost trace.
4. THE SYSTEM SHALL replay each loop through the replay transport as a Revenant voice, scheduling control changes with a lookahead of 100 ms and re-anchoring every iteration to the bar grid.
   **Property:** for any BPM in [60, 160] and loop length in {1, 2, 4} bars, iteration k starts exactly at the bar-grid time for k.
   **Property:** every scheduled control event lies within its iteration's time span.
5. WHEN the scale changes, THE SYSTEM SHALL apply it to loops from their next note decision (loops re-harmonise).
6. THE SYSTEM SHALL allow up to 4 loops, each with mute and delete controls.

### Requirement 9 — Stage and accessibility

**User Story:** As an audience member or a user with different needs, I want to see who is singing and control the choir with a keyboard, so that it is understandable and accessible.

#### Acceptance Criteria

1. THE SYSTEM SHALL show one original singing avatar per voice, with mouth openness following the voice envelope, glow and badge following the spirit's mood, and a colour and name per voice.
2. THE SYSTEM SHALL render loop voices as Revenant singers with a loop-progress ring.
3. THE SYSTEM SHALL make scale, tempo, master volume, per-voice mute, loop arm/mute/delete reachable by keyboard with visible focus.
4. WHILE reduced motion is active, THE SYSTEM SHALL use static avatars with numeric level indicators and a numeric beat counter.
5. WHERE no phone is available, THE SYSTEM SHALL offer a recorded séance (bundled demo traces) and a keyboard-played voice.
