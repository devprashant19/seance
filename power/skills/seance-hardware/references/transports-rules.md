# Transport Rules

Mirror of `.kiro/steering/transports.md` in the Séance repo. Re-copy it before publishing the power.

## The Spirit contract
- Implement the full interface: `summon()`, `banish()`, `stream(channel)` → `{ subscribe(cb) → unsubscribe, latest() }`, `capabilities: ChannelInfo[]`, `health(): HealthReport`, `on('state' | 'health' | 'error', cb)`.
- States: `idle → summoning → present → fading → banished`, plus `error`. Every transition emits `state`.
- `SampleBatch = { channel, seq, t: Float64Array (laptop-clock ms), values: Float32Array[] (one per axis, already in the channel's unit) }`. `seq` gaps mean dropouts.

## Permissions and platform quirks
- HTTPS only. Request iOS motion/orientation permission inside a user tap. Handle `denied` explicitly with a message and a retry path.
- Microphone: `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })` for measurement. Processing filters distort spectra.
- Feature-detect Vibration, Wake Lock, Web Serial, Web Bluetooth and Web MIDI. Never assume them.

## Timing
- Batch about 50 ms per message. Never one message per event.
- Timestamp each sample at the source (`event.timeStamp` or `performance.now()` on the phone). Convert to laptop time with the clock-sync offset (NTP-style four timestamps; keep the lowest-RTT estimates; fit drift linearly).
- Health uses sample timestamps: `jitterPct = 100 × std(Δt)/mean(Δt)`; a dropout is a `seq` gap or Δt > 2.5 × median Δt.

## Resilience
- Disconnects and reconnects are explicit states. A reconnect resumes the same spirit id.
- Never block the UI thread. Process streams outside React render; update UI at animation-frame rate.
- Every transport passes the shared contract tests and replays through the mock transport.
