# Implementation Plan — phone-bridge

Phase 3 (Wed Nov 25 – Thu Nov 26 AM). Goal for Wednesday night: live numbers from a phone on the laptop. Thursday morning: clock sync, health, reconnect, latency measured. Optional tasks are marked `*`.

- [x] 1. Shared protocol
  - [x] 1.1 `protocol.ts`: envelope, all message types, `PROTOCOL_VERSION = 1`, type guards
    - _Requirements: 3.3, 3.4_
  - [x] 1.2 Batch encode/decode helpers (columnar, per channel group) + property test: split/reassemble preserves samples
    - _Requirements: 3.7_

- [x] 2. Relay server (`packages/seance-relay`)
  - [x] 2.1 HTTP server with `/healthz`, ws upgrade, `ALLOWED_ORIGINS` check
    - _Requirements: 9.1, 9.4_
  - [x] 2.2 Room registry: code alphabet, uniqueness, host token, capacity 8, expiry timers
    - _Requirements: 1.1, 1.4, 1.5_
  - [x] 2.3 Property test: codes use only the allowed alphabet and never collide among live rooms
    - _Requirements: 1.6_
  - [x] 2.4 Role routing: peer→host, host→peer (`to`), copies to observers; observer key check
    - _Requirements: 8.1, 8.2_
  - [x] 2.5 Limits: 64 KB message cap, 60 msg/s token bucket, payload-free logging
    - _Requirements: 9.2, 9.3_
  - [x] 2.6 Resume tokens for peers and hosts; keep room 10 min after host drop
    - _Requirements: 6.1, 6.5_
  - [x] 2.7 Relay tests with fake timers (expiry, capacity, origin, rate limit, observer)
    - _Requirements: 1.4, 1.5, 9.1, 9.2, 8.2_

- [ ] 3. Phone client
  - [ ] 3.1 Join page shell on each app: `/join/:code` via the shared `PhoneJoin` component (seance-avatars), HTTPS check, room-missing state; < 50 KB gzip JS before the Begin tap
    - _Requirements: 1.3, 2.4_
  - [ ] 3.2 "Begin the séance" button calling `requestPermission()` inside the tap; denied state with fix text
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 3.3 Sensor capture + unit conversion at the edge + NaN filtering
    - _Requirements: 3.1, 3.2, 3.6_
  - [ ] 3.4 50 ms batcher with `seq`
    - _Requirements: 3.3, 3.4_
  - [ ] 3.5 Clock-sync responder (`t1` on receive, `t2` just before send)
    - _Requirements: 4.1_
  - [ ] 3.6 Wake lock acquire/re-acquire + "Keep this screen on" fallback
    - _Requirements: 2.5, 6.4_
  - [ ] 3.7 `visibilitychange` → `peer-hidden` / `peer-visible`
    - _Requirements: 5.3_
  - [ ]* 3.8 Microphone channel on the phone (only for experiments that ask)
    - _Requirements: 2.6_
  - [ ] 3.9 Mode-specific phone surface: the host sends its mode in control (`lab` = Begin + status, `choir` = full-screen touch-and-hold pad streaming `control.touch` in normal batches). Needed by Phase 6; Choir falls back to shake-only drone mode without it
    - _Requirements: 3.1_

- [ ] 4. Clock sync (pure core)
  - [ ] 4.1 `offsetAndDelay`, `estimate` (min-RTT quartile + drift fit), `toHostTime`
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ] 4.2 Property tests: convergence within 5 ms after 8 exchanges (symmetric delay); error ≤ half asymmetry
    - _Requirements: 4.6, 4.7_
  - [ ] 4.3 Host timer shell: send `sync` every 2 s per peer, record `t3`
    - _Requirements: 4.1_

- [ ] 5. Host transport
  - [ ] 5.1 `createPhoneBridgeHost` (create room, QR URL, peer map, `onSpirit`)
    - _Requirements: 7.1, 1.2_
  - [ ] 5.2 `PhoneSpirit` (capabilities from `ready`, time mapping, per-channel batches, generated label)
    - _Requirements: 7.2, 7.3, 4.5_
  - [ ] 5.3 Health integration: seq-gap dropouts, RTT/offset in report, slow-link and hidden reasons
    - _Requirements: 3.5, 5.1, 5.2, 5.3_
  - [ ] 5.4 `fake-relay.ts` + `runSpiritContract('phone-bridge')`
    - _Requirements: 7.4_

- [ ] 6. Reconnection
  - [ ] 6.1 Backoff policy (pure) + unit tests for the delay sequence and 2-minute give-up
    - _Requirements: 6.2_
  - [ ] 6.2 Phone resume with token → same Spirit id on host; host resume with host token
    - _Requirements: 6.3, 6.5_
  - [ ] 6.3 Manual test: lock phone 30 s, unlock → spirit returns to `present` without rescanning (pending real phone session)
    - _Requirements: 6.3, 6.4_

- [ ] 7. QR and join UX (shared component in seance-avatars or app)
  - [ ] 7.1 QR rendering (small dependency such as `qrcode`) + large code text + copy link
    - _Requirements: 1.2_
  - [ ] 7.2 "Circle is full" and "séance has ended" screens
    - _Requirements: 1.3, 1.5_

- [ ] 8. Deploy and measure
  - [ ] 8.1 Deploy relay to the chosen Node host near you; set `ALLOWED_ORIGINS`, `SEANCE_OBSERVER_KEY` (scheduled for K6)
    - _Requirements: 9.1, 8.2_
  - [ ] 8.2 Run the latency protocol (Wi-Fi + hotspot, 2 phones) and record results in `docs/sensor-reality.md` §Bridge (scheduled for K5/K6)
    - _Requirements: 10.1_

- [ ]* 9. WebRTC upgrade (only if median relay RTT > 150 ms)
  - [ ]* 9.1 Signalling via relay (`rtc-offer/answer/ice`), unordered/no-retransmit data channel for `batch` (optional fallback)
    - _Requirements: 10.1, 10.3_
  - [ ]* 9.2 5 s timeout fallback to WebSocket, silently (optional fallback)
    - _Requirements: 10.2_
