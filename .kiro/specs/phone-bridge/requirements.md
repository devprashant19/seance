# Requirements Document — phone-bridge

## Introduction

The phone bridge turns a phone browser into a `poltergeist` (motion) and optionally `banshee` (microphone) spirit on a laptop, with no app install. It consists of:

- `packages/seance-relay` — a Node WebSocket server that hosts short-lived rooms.
- `packages/seance-core/src/transports/phone-bridge/` — the laptop-side transport (`host`) that turns room traffic into `Spirit`s.
- A phone-side client page (`/join/<ROOM>`) served by each app, built from a small shared module in `seance-core/transports/phone-bridge/phone-client`.

The first version relays all data over WebSocket. A WebRTC data channel is an optional upgrade if measured latency on the relay exceeds the 150 ms budget. Message formats are defined in `phases/phase-03-phone-bridge/protocol.md`.

## Requirements

### Requirement 1 — Rooms and join codes

**User Story:** As a judge, I want to join by scanning one QR code, so that I never type anything.

#### Acceptance Criteria

1. WHEN a laptop app opens a session, THE SYSTEM SHALL create a room and return a 4-character code from an unambiguous alphabet (no `0/O`, `1/I/L`).
2. THE SYSTEM SHALL display a QR code encoding `https://<app-host>/join/<CODE>` plus the code in large text.
3. WHEN a phone opens `/join/<CODE>` for a room that does not exist or has expired, THE SYSTEM SHALL show "This séance has ended" and a button to the app's landing page.
4. THE SYSTEM SHALL expire a room 10 minutes after its host disconnects, and 4 hours after creation in any case.
5. THE SYSTEM SHALL allow up to 8 phones per room (Banshee Choir) and reject further joins with a "circle is full" message.
6. **Property:** Generated room codes never contain characters outside the allowed alphabet, and no two live rooms share a code.

### Requirement 2 — One-tap permission flow

**User Story:** As a phone user, I want a single tap to start, so that iOS permission prompts don't confuse me.

#### Acceptance Criteria

1. THE SYSTEM SHALL show exactly one primary button: "Begin the séance".
2. WHEN the user taps it on a browser that exposes `DeviceMotionEvent.requestPermission`, THE SYSTEM SHALL call it (and the orientation equivalent) synchronously inside the tap handler.
3. IF permission is denied, THEN THE SYSTEM SHALL explain in one sentence how to re-enable motion access and offer the replay demo instead.
4. IF the page is not served over HTTPS, THEN THE SYSTEM SHALL show "Sensors need a secure link" and not attempt to stream.
5. WHEN the user taps "Begin", THE SYSTEM SHALL request a Screen Wake Lock where supported and SHALL show "Keep this screen on" where not.
6. WHERE the microphone is needed (Singing Ruler on phone), THE SYSTEM SHALL request it only when that experiment asks, with its own explanatory tap.

### Requirement 3 — Sample capture and batching

**User Story:** As an experiment, I want complete, well-timed batches, so that analysis is accurate.

#### Acceptance Criteria

1. THE SYSTEM SHALL capture `devicemotion` (`acceleration`, `accelerationIncludingGravity`, `rotationRate`) and `deviceorientation` events with `performance.now()` timestamps on the phone.
2. THE SYSTEM SHALL convert `rotationRate` from deg/s to rad/s and orientation from degrees to radians before sending (verify units per platform in Phase 1).
3. THE SYSTEM SHALL send one batch per channel group about every 50 ms containing all samples captured since the previous batch.
4. THE SYSTEM SHALL number batches with a per-connection `seq` starting at 0.
5. WHEN the laptop receives a batch whose `seq` skips values, THE SYSTEM SHALL count the missing batches as dropouts in health.
6. THE SYSTEM SHALL drop samples containing `null`, `NaN` or `Infinity` and count them.
7. **Property:** Splitting a sample stream into batches and reassembling it on the host yields the original samples in order (for any batch boundaries).

### Requirement 4 — Clock synchronisation

**User Story:** As a multi-device experiment, I want phone timestamps mapped onto the laptop clock, so that samples from different devices line up.

#### Acceptance Criteria

1. THE SYSTEM SHALL run an NTP-style exchange every 2 s: host sends `t0`, phone replies `t1` (receive) and `t2` (send), host records `t3`.
2. THE SYSTEM SHALL compute offset θ = ((t1 − t0) + (t2 − t3)) / 2 and round-trip δ = (t3 − t0) − (t2 − t1).
3. THE SYSTEM SHALL keep the last 16 exchanges and use the offset from the exchanges with the lowest δ (lowest quartile).
4. THE SYSTEM SHALL estimate drift by a linear fit of offset against host time over the kept exchanges and expose `driftPpm`.
5. THE SYSTEM SHALL convert every phone timestamp to laptop time as `tLaptop = tPhone − θ(tPhone)` before emitting `SampleBatch`.
6. **Property:** For simulated symmetric random network delays (0–200 ms) and a true offset in ±10⁶ ms, the estimated offset converges within 5 ms after 8 exchanges.
7. **Property:** With asymmetric delay the offset error never exceeds half the asymmetry (the theoretical NTP bound).

### Requirement 5 — Health reporting

**User Story:** As a user, I want the ghost to show whether my phone link is good.

#### Acceptance Criteria

1. THE SYSTEM SHALL feed every received batch into the `seance-core` `HealthMonitor` and add `clockOffsetMs` and `rttMs` to the `HealthReport`.
2. WHEN RTT exceeds 300 ms for 5 s, THE SYSTEM SHALL set the reason to "The connection is slow — try the same Wi-Fi or a phone hotspot".
3. WHEN the phone tab goes to the background (`visibilitychange` → hidden), THE SYSTEM SHALL notify the host so the mood becomes `fading` with reason "The phone screen is off".

### Requirement 6 — Reconnection

**User Story:** As a user whose phone screen locked, I want the spirit to come back by itself, so that I don't have to scan again.

#### Acceptance Criteria

1. THE SYSTEM SHALL give each phone a `peerId` stored in `sessionStorage` (fallback: memory) and a resume token issued by the relay.
2. WHEN the phone socket drops, THE SYSTEM SHALL retry with exponential backoff (250 ms doubling to 5 s, jittered) for up to 2 minutes.
3. WHEN the phone reconnects with a valid resume token, THE SYSTEM SHALL map it to the same `Spirit` on the host (same `id`, state returns to `present`).
4. WHEN the page becomes visible again, THE SYSTEM SHALL re-acquire the wake lock.
5. WHEN the laptop socket drops, THE SYSTEM SHALL keep the room alive for 10 minutes and resume the host role with its host token.

### Requirement 7 — Spirit integration

**User Story:** As an app developer, I want joined phones to appear as ordinary spirits.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose `createPhoneBridgeHost({ relayUrl })` returning `{ room, onSpirit(cb), close() }`.
2. WHEN a phone completes the "Begin" tap, THE SYSTEM SHALL emit a new `poltergeist` spirit with capabilities `accel`, `accelG`, `gyro`, `orientation` (only those the phone actually reports).
3. THE SYSTEM SHALL label spirits with a generated name such as "Restless Pixel" derived from the user agent (never typed by the user).
4. THE phone-bridge transport SHALL pass `runSpiritContract` using an in-process fake relay.

### Requirement 8 — Observer access for tooling

**User Story:** As Kiro (via seance-mcp), I want to watch a dev room without being a phone or the host.

#### Acceptance Criteria

1. THE SYSTEM SHALL support an `observer` role that receives a copy of every data and health message in a room but cannot send data.
2. THE SYSTEM SHALL require an observer key (env `SEANCE_OBSERVER_KEY`) for observer joins, and SHALL allow observers only when the key is configured.

### Requirement 9 — Limits and safety

**User Story:** As the relay operator, I want the free-tier server to stay up.

#### Acceptance Criteria

1. THE SYSTEM SHALL reject WebSocket upgrades whose `Origin` is not in `ALLOWED_ORIGINS` (localhost and the deployed app hosts).
2. THE SYSTEM SHALL cap messages at 64 KB and each connection at 60 messages per second; excess messages are dropped and counted.
3. THE SYSTEM SHALL never log sample payloads, only counts and timings.
4. THE SYSTEM SHALL expose `GET /healthz` returning room and connection counts.

### Requirement 10 — Optional WebRTC upgrade

**User Story:** As a user on a distant relay, I want lower latency if possible.

#### Acceptance Criteria

1. WHERE WebRTC is enabled and the measured relay RTT median exceeds 150 ms, THE SYSTEM SHALL attempt an unordered, no-retransmit data channel for sample batches using the relay for signalling.
2. IF the data channel fails to open within 5 s, THEN THE SYSTEM SHALL stay on WebSocket without user-visible errors.
3. THE SYSTEM SHALL keep control messages (clock sync, state) on the ordered path.
