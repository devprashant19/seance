# Banshee Choir Validation

## 3-Phone Jam Benchmark

| Metric | Target | Measured |
|---|---|---|
| Dropout rate (2 min stream) | < 0.5% | Pending live test |
| Fading disconnections | 0 | Pending live test |
| Motion-to-sound latency | < 200 ms | Pending live test |
| Looper bar-grid sync error | < 5 ms | Pending live test |
| Master limiter clipping (4 voices + 2 loops) | 0 dBFS ceiling | Configured at -3 dB threshold, 20:1 ratio |

## Audio Engine Verification

- Dual detuned oscillators (sawtooth + triangle, +7 cents)
- Sub-vocal vibrato LFO at 5.5 Hz, 12 cents depth
- Dual-bandpass formant filter pair (3 presets: oo/ah/ee)
- Lowpass filter driven by roll orientation
- Tremolo depth/rate driven by shake magnitude
- Envelope: 40 ms attack, 150 ms release
- Stereo panner per voice (-0.7 to +0.7)
- All parameter updates via setTargetAtTime (zero zipper noise)

## Looper Verification

- Bar clock syncs to AudioContext.currentTime
- Recording arms and starts at next bar boundary
- Motion control curves stored (pitch, cutoff, gate) — not raw audio
- Re-harmonization works when scale changes mid-loop
- Up to 4 concurrent loops on master bus

## Keyboard Demo

- Space = sing gate, A-K = note selection
- Scale selector: Graveyard / Crypt / Fog
- Volume slider + mute + drone mode toggle
- Judges can play immediately without a phone
