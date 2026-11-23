---
inclusion: fileMatch
fileMatchPattern: ["packages/seance-core/src/transports/**", "packages/seance-relay/**", "apps/*/src/join/**"]
---
# Transport rules (Séance)

A transport turns a device into a `Spirit`. Every transport behaves identically from the app's point of view.

## The contract
- Implement the full `Spirit` interface by extending `BaseSpirit`: `summon`, `banish`, `stream(channel)`, `capabilities`, `health`, `on`.
- State machine: `idle → summoning → present ⇄ fading`, `→ banished` on banish, `→ error` with a reason on failure. A banished spirit is never reused.
- Emit `SampleBatch` values in **canonical units** (see `units.md`) with timestamps on the **laptop clock** in ms. Convert at the edge, once.
- `seq` strictly increases per channel; gaps mean dropouts — call `recordDropout(n)`.
- Drop `null`/`NaN`/`Infinity` samples at the edge and count them as dropouts.
- `isSupported()` must never throw and must be safe at import time (Safari has no Web Serial/BLE/MIDI).
- `banish()` clears every timer, listener, socket and media track. Contract tests check for leaked handles.

## Permissions and platforms
- iOS motion permission: `DeviceMotionEvent.requestPermission()` (and the orientation one) must be called **synchronously inside the user's tap handler** — no `await` before it.
- HTTPS only. If `!isSecureContext`, show "Sensors need a secure link" and do not try.
- Request the Screen Wake Lock on "Begin"; re-acquire on `visibilitychange` → visible; show "Keep this screen on" when unsupported.
- Microphone: request only when the experiment needs it, with processing off (`echoCancellation`, `noiseSuppression`, `autoGainControl` = false) and check `track.getSettings()`.
- Measured platform facts live in `docs/sensor-reality.md` — check it before assuming rates or units.

## Performance
- Never do analysis in event handlers. Store raw values in preallocated typed arrays; batch every ~50 ms.
- No per-sample object allocation on the hot path.
- Phone join page JS budget: < 50 KB gzip before the Begin tap (sensor code may lazy-load after it).

## Network (phone bridge)
- WebSocket relay first; WebRTC only as the optional upgrade defined in the phone-bridge spec.
- Reconnect with jittered exponential backoff (250 ms → 5 s, give up after 2 min) and a resume token so the same Spirit comes back.
- Never log sample payloads in the relay — counts and timings only.

## Errors users see
Every failure has one plain-language sentence and a next action (retry, open replay demo, switch network). Spooky wording is allowed only alongside the plain sentence.

## Before you finish
- [ ] `runSpiritContract('<transport>', …)` passes.
- [ ] Reconnection tested (fake relay or manual lock/unlock).
- [ ] Units at the edge match `docs/sensor-reality.md`.

References: #[[file:packages/seance-core/src/spirit.ts]] #[[file:packages/seance-core/src/transports/contract.ts]]
