# Banshee Choir Validation

## Stream and latency benchmark

Tested on mobile (2026-11-25): a simulated phone in Chrome mobile emulation ran the real phone page
(`join.html`), sending hardware-timed 60 Hz motion readings through the real relay to the laptop pages,
all on one machine. Wi-Fi is not included, and the latency excludes the phone's own sensor delay and the
laptop's audio output buffer, so a real phone over Wi-Fi will measure higher.

| Metric | Target | Measured (tested on mobile, simulated phone, same machine) |
|---|---|---|
| Dropout rate (2 min stream) | < 0.5% | **0.000 %** — 7,199 samples in 120.0 s, median interval 16.67 ms, 0 gaps > 3× median |
| Fading disconnections | 0 | **0** during the 2-minute stream |
| Key-to-sound latency (phone key → laptop synth) | < 200 ms | **median 3.3 ms, p95 3.9 ms, max 10.4 ms** over 20 key presses |
| Looper bar-grid sync error | < 5 ms | Not measured: the looper is unit-tested but not connected to the Choir screen yet |
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

## Looper (unit-tested logic, not yet on the Choir screen)

- Bar clock syncs to AudioContext.currentTime
- Recording arms and starts at next bar boundary
- Motion control curves stored (pitch, cutoff, gate) — not raw audio
- Re-harmonization works when scale changes mid-loop
- Up to 4 concurrent loops on master bus

## Instruments and phone keys (tested on mobile, simulated phones)

- 8 instruments; switching applies on the laptop and enforces a 10 s cooldown on phone and laptop
- Phone sing pad = 8 keys A–K: pressing D then sliding to H played 293.66 Hz then 440 Hz on the laptop
- Haunted Organ played the same key an octave down (146.83 Hz); Crypt Bells struck 220 Hz with its 770 Hz FM partner
- The voice opens while a key is held and closes on release

## Keyboard Demo

- Space = sing gate, A-K = note selection
- Scale selector: Graveyard / Crypt / Fog
- Volume slider + mute + drone mode toggle
- Judges can play immediately without a phone
