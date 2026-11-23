---
inclusion: fileMatch
fileMatchPattern: ["apps/banshee-choir/**", "**/audio/**"]
---
# Audio rules (Web Audio)

## Sound sources
- **Synthesized only.** Oscillators, filters, generated noise and generated impulse responses. No audio files, samples, loops or recordings from anywhere — this keeps the repo and the demo video licence-clean.
- The laptop is the only sound source in the Choir; phones are controllers.

## Graph rules
- Build a voice's graph once when it is created; **never rewire a sounding voice**. Change sound only through `AudioParam` automation.
- Use `setTargetAtTime` for smooth control changes and `setValueAtTime` for scheduled events. Never assign `param.value` while audio is running (it clicks and fights automation).
- Never schedule in the past: "now" is `ctx.currentTime`.
- Update parameters at most 60 times per second per voice, from the newest sample of each batch.
- Dispose voices properly: release tail, stop oscillators, disconnect every node.

## Safety
- Every path goes through the master bus: 1/√N sum → reverb send (wet ≤ 0.25) → **limiter** (DynamicsCompressor: threshold −6 dB, knee 0, ratio 20, attack 3 ms, release 100 ms) → master gain ≤ 0.9. The limiter is never bypassed, not even in tests or demos.
- A faded or disconnected spirit closes its gate with the release curve — no stuck drones.

## Timing
- Musical time comes from the AudioContext clock. Never derive beat times by accumulating `setTimeout`/`setInterval` delays.
- Use a lookahead scheduler (≈ 25 ms tick, ≈ 100 ms horizon) and re-anchor loops to the bar grid every iteration.
- Looper takes are recorded at **apply time** (when the control reached the audio graph) so loops sound exactly like the live take.

## Latency
- `new AudioContext({ latencyHint: 'interactive' })`; log `baseLatency`/`outputLatency`.
- Target motion → sound ≤ 200 ms. Use built-in or wired speakers for demos (Bluetooth adds 100–300 ms).

## Autoplay
- Create/resume the AudioContext only inside a user gesture; show an unlock overlay whenever `ctx.state === 'suspended'` (including after returning to the tab).

## Musical mapping
- Pitch always snaps to the selected scale (Graveyard 0-3-5-7-10, Crypt 0-1-3-5-7-8-10, Fog 0-2-4-6-8-10) over two octaves from the room root, with hysteresis (change only beyond ±0.65 of the current note).
- Mapping functions (`tiltToPosition`, `snapToScale`, `rollToCutoff`, `shakeEnvelope`, `shakeToTremolo`) are pure, unit-typed at the inputs, and property-tested.

## Accessibility
- Every control is keyboard reachable; voices are identified by colour **and** name; reduced motion uses static avatars, numeric levels and a numeric beat counter.
- Provide a master volume control and per-voice mute.
