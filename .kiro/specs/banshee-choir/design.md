# Design Document — Banshee Choir

## Overview

A Vite + React app (`apps/banshee-choir`, port 5174). Phones are `poltergeist` spirits in a room (phone-bridge); the laptop renders a stage and runs all audio. A `defineInstrument` plugin maps each spirit's batches to voice controls; a voice graph per spirit turns controls into sound; a master bus keeps everything clean. The Ghost Looper records controls as ghost traces and replays them through the replay transport as Revenant voices on a bar grid derived from the AudioContext clock.

Reference briefs: `phases/phase-06-banshee-choir-mvp/audio-engine.md` and `ghost-looper.md` in the planning workspace.

## Architecture

```
phone-bridge room ──► Spirit[] (poltergeist) ──► ChoirSession
                                                   │ per spirit
                                                   ▼
                                     instrument.map(state, batch, params)  [PURE]
                                                   │ VoiceControls (note, cutoff, tremolo, gate)
                                                   ▼
                                     instrument.apply(voice, controls, ctxTime)
                                                   │ AudioParam automation only
                                                   ▼
            Voice graph (osc×2 → formants → lowpass → tremolo → gate → panner) ──► MasterBus
                                                                                     │
Looper: BarClock(ctx) ── arm/record ──► LoopTrace (GhostTrace) ──► replay transport (loop) ──► Revenant voice ─┘
                                                                        ▲
                                                           LookaheadScheduler (25 ms tick, 100 ms horizon)
Stage (React): Singer avatars, scale/tempo/volume controls, loop controls, meter
```

## Components and Interfaces

```ts
// audio/scales.ts
export type ScaleId = 'graveyard' | 'crypt' | 'fog';
export const SCALES: Record<ScaleId, number[]>;          // semitone offsets within an octave
export function scaleFrequencies(scale: ScaleId, rootHz: number, octaves = 2): number[];
export function snapToScale(position: number, n: number /*current index*/, count: number, hysteresis = 0.15): number;

// audio/mapping.ts  (pure)
export function tiltToPosition(beta: Quantity<'rad'>, neutral: Quantity<'rad'>, rangeRad = 50 * Math.PI / 180): number;
export function rollToCutoff(gamma: Quantity<'rad'>, neutral: Quantity<'rad'>): Quantity<'Hz'>;
export function shakeEnvelope(prev: number, accelMag: Quantity<'m/s^2'>, dtMs: number): number; // returns e (m/s²)
export function shakeToTremolo(s: number): { depth: number; rateHz: number };

// audio/voice.ts
export interface Voice { id: string; preset: VoicePreset; input: AudioNode; dispose(releaseS?: number): void; params: VoiceParams }
export function createVoice(ctx: AudioContext, bus: MasterBus, preset: VoicePreset, pan: number): Voice;

// audio/bus.ts
export interface MasterBus { input: AudioNode; analyser: AnalyserNode; setActiveVoices(n: number): void; setVolume(v: number): void }
export function createMasterBus(ctx: AudioContext): MasterBus;  // sum → reverb send → limiter → master (≤ 0.9)

// instrument/banshee-voice.ts
export default defineInstrument({ id: 'banshee-voice', spirits: ['poltergeist'], channels: ['orientation', 'accel', 'control.touch'], createVoice, map, apply, params });

// looper/
export interface BarClock { bpm: number; beatsPerBar: 4; t0: number; barTime(k: number): number; nextBarAfter(t: number): number }
export function iterationStart(clock: BarClock, startBar: number, bars: 1 | 2 | 4, k: number): number;  // pure
export interface Loop { id: string; voicePreset: VoicePreset; trace: GhostTrace; bars: 1 | 2 | 4; startBar: number; muted: boolean }
export function createScheduler(ctx: AudioContext, tickMs = 25, horizonMs = 100): Scheduler;
```

- `ChoirSession` owns the voice map keyed by spirit id, the neutral tilt per voice, the scale/tempo/drone params, and the loop list.
- Phones in a Choir room show a touch pad (phone-bridge control surface) that streams `control.touch` (unit `'1'`, axis `down`); without it, drone mode is the default.
- Reverb impulse is generated at start-up (stereo noise × exponential decay, 2.5 s).

## Data Models

- **VoiceControls:** `{ noteIndex, frequencyHz, cutoffHz, tremoloDepth, tremoloRateHz, gate }`.
- **Loop trace:** `GhostTrace` v1 with `experiment: null`, channels `orientation`, `accel`, `control.touch`, `t` = ms from the bar-aligned loop start in **apply time**, `notes` = `"looper: t = audio apply time; bpm=…; bars=…"`.
- **Demo performance:** bundled traces with role `demo` in `fixtures/traces/bundled.json` (3 voices recorded together).

## Error Handling

| Condition | Behaviour |
|---|---|
| AudioContext suspended | overlay with unlock button; re-check on visibility change |
| Spirit fades | close the gate with release; avatar fades (mood) |
| Phone leaves | release tail, then dispose voice; free the preset slot |
| > 8 phones | audience ghosts, message |
| No touch channel from phone | drone mode for that voice, small notice |
| Scheduler tick late (tab throttled) | events are scheduled by audio-clock time, so late ticks only shrink the lookahead; if a tick misses the horizon, skip past events rather than playing them late |

## Testing Strategy

- **Property-based:** scale membership, hysteresis stability, sweep monotonicity, position/cutoff/envelope ranges and monotonicity, loop iteration timing, events within iteration span (Requirements 3, 4, 8).
- **Unit:** master bus wiring (limiter present, gain cap), voice lifecycle (create → dispose disconnects), drone mode mapping, unlock overlay state with a mocked AudioContext.
- **Offline audio check:** render 4 voices + 4 loops with `OfflineAudioContext` and assert peak < 0 dBFS.
- **Manual/field:** 3-phone 2-minute jam (health stats), latency measurement, tap-on-the-beat loop test — recorded in `docs/choir-validation.md`.

## Correctness Properties

| ID | Property | Requirement |
|---|---|---|
| P-CH-1 | position ∈ [0, 1] for all finite tilt | 3.1 |
| P-CH-2 | output frequency ∈ scale | 3.2 |
| P-CH-3 | no note change within ±0.65 | 3.3 |
| P-CH-4 | monotone sweep → non-decreasing notes | 3.3 |
| P-CH-5 | cutoff monotone, within [300, 6000] Hz | 4.1 |
| P-CH-6 | s ∈ [0, 1], envelope ≥ 0 | 4.2 |
| P-CH-7 | tremolo depth/rate monotone in s | 4.3 |
| P-CH-8 | loop iteration k starts on the bar grid | 8.4 |
| P-CH-9 | scheduled events within iteration span | 8.4 |
