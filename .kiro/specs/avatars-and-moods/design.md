# Design Document — Avatars and Moods

## Overview

Two layers:

1. **`packages/seance-avatars`** — reusable React components and pure helpers: orientation maths, mood → visual mapping, the 3D Poltergeist, 2D variants, placeholder spirits and the Revenant wrapper. It depends only on `seance-core`'s public entry, React, three.js / `@react-three/fiber`, and Framer Motion.
2. **`apps/poltergeist-lab` routes** — `Landing` and `Possession`, which compose the avatars with the phone bridge (room, QR, tutorial, doors, failure states).

Moods are **computed in `seance-core`** (`health/thresholds.ts`, single source of truth) and only **visualised** here.

Reference brief: `phases/phase-04-possession/avatar-and-mood-spec.md` and `first-60-seconds.md` in the planning workspace.

## Architecture

```
seance-core (P2/P3)                      seance-avatars (this spec)                 poltergeist-lab
────────────────────                     ──────────────────────────                 ───────────────
Spirit.stream('orientation') ──batch──►  orientation/                               routes/Landing.tsx
Spirit.stream('accel')                     deviceOrientationToQuaternion()            QR, room code, candles,
Spirit.health() / on('health')             headingNormaliser(qRef)                    relay-down state,
                                           smoother(τ, maxStep)                       "watch a recorded haunting"
health/thresholds.ts ─► HealthReport ──►  mood/                                     routes/Possession.tsx
                                           moodVisuals(mood, health)                  tutorial state machine,
                                           useMoodWithHysteresis()                    doors, drawer, failure states
                                         components/
                                           SpiritAvatar ─┬─ Poltergeist3D (r3f)
                                                         ├─ PoltergeistFlat (SVG)
                                                         ├─ placeholders (SVG)
                                                         └─ Revenant (wrapper)
                                           MoodBadge, MoodTooltip, CalibrationRing
```

### Data flow per frame

1. Stream subscription writes the newest `orientation` sample into a **ref** (no React state).
2. `useFrame` reads the ref → quaternion pipeline → smoothing → sets `mesh.quaternion`.
3. Health events (≤ 10 Hz) go through `useMoodWithHysteresis` → React state → re-render only when the displayed mood changes.
4. Mood visuals are uniforms on the ghost material (glow, hue, wobble speed) plus a few refs (twitch timer, spark emitter rate).

## Components and Interfaces

```ts
// orientation/
export type Quat = { x: number; y: number; z: number; w: number };
export function deviceOrientationToQuaternion(alpha: number, beta: number, gamma: number): Quat; // rad, device→earth
export function earthToWorld(q: Quat): Quat;                       // qC · q, qC = −90° about x
export function captureReference(samples: Quat[]): Quat;           // sign-aligned normalised mean
export function headingNormaliser(qRef: Quat): (qNow: Quat) => Quat; // returns G = Y·(qNow·qRef⁻¹)·Y⁻¹
export function smoothStep(current: Quat, target: Quat, dtMs: number, tauMs: number, maxStepRad: number): Quat;

// mood/
export interface MoodVisuals {
  glow: number; glowFlickerHz: number; opacity: number;
  floatAmp: number; floatHz: number; twitchPerSec: number; trembleRad: number;
  sparksPerSec: number; wobbleSpeed: number; hueDeg: number;
  badge: 'steady' | 'half' | 'burst' | 'hollow'; lantern: number;
}
export function moodVisuals(mood: Mood, health: HealthReport): MoodVisuals; // pure
export function useMoodWithHysteresis(health: HealthReport, calmerHoldMs = 500): Mood;

// components/
export function SpiritAvatar(p: { spirit: Spirit; size?: 'hero' | 'card' | 'chip'; reducedMotion?: boolean }): JSX.Element;
export function Poltergeist3D(p: { spirit: Spirit; calibration?: Calibration; dragFallback?: boolean }): JSX.Element;
export function PoltergeistFlat(p: { spirit: Spirit; calibration?: Calibration }): JSX.Element;
export function Revenant(p: { spirit: Spirit; recordedAt: string; device: string }): JSX.Element;
export function MoodBadge(p: { health: HealthReport }): JSX.Element;
export function CalibrationRing(p: { progress: number; state: 'filling' | 'draining' | 'done' }): JSX.Element;
export function useReducedMotion(): boolean;   // media query OR Calm-mode toggle

export interface Calibration { qRef: Quat; gyroBias: [number, number, number]; at: number }
```

### Possession tutorial state machine (app)

```
TILT ──(≥ 20° cumulative rotation or 2 s)──► SHAKE ──(peak |accel| ≥ 12 m/s² or skip)──► STILL
STILL ──(2 s below stillness threshold)──► DONE ──► DOORS
any ──(skip)──► DOORS
any ──(spirit fading)──► (paused, resumes on return)
```

### Laptop states

`CONNECTING → CIRCLE_OPEN → SUMMONING → POSSESSED(tutorial) → DOORS`, with side states `RELAY_DOWN`, `REPLAY_HAUNTING`, `FADING` (see the storyboard for copy).

## Data Models

- **Input:** `SampleBatch` for `orientation` (rad; axes alpha, beta, gamma), `accel` (m/s²), `gyro` (rad/s); `HealthReport` (from conventions).
- **Calibration:** `{ qRef, gyroBias, at }` — kept in memory for the session; passed to the Lab through router state so experiments know the bias.
- **Copy deck:** `apps/poltergeist-lab/src/copy/possession.ts` — every string as `{ spooky, plain }`.

## Error Handling

| Condition | Detection | Response |
|---|---|---|
| Relay unreachable | no `room-created` within 2 s | hide QR, explain, offer replay, retry every 5 s |
| Permission denied (iOS) | `requestPermission()` resolves `'denied'` | phone: retry instructions + *Try again*; laptop: faint ghost + note |
| No sensors | no `devicemotion` within 1 s after tap | phone: "no motion spirit", suggest Choir mic |
| Insecure context | `!isSecureContext` | phone: open over HTTPS |
| Spirit fades | `HealthReport.mood === 'fading'` | translucent ghost, reconnect pulse, tooltip; resume without re-rise |
| WebGL unavailable / slow | context creation fails or frame guard trips | `PoltergeistFlat` + toast |
| NaN in orientation | guard in pipeline | drop sample, count it in a dev counter |

## Testing Strategy

- **Property-based (fast-check, Vitest):** Requirement 1 properties (unit norm, identity at reference, alpha wrap-around continuity, smoothing never overshoots), Requirement 3 properties (mood ordering monotonic, totality). Generators: angles in the documented ranges incl. boundaries; random `HealthReport` with rates 0–200 Hz, jitter 0–200%, dropouts 0–1000.
- **Unit:** tutorial state machine transitions; hysteresis timing with fake timers; copy deck completeness (every key has spooky + plain).
- **Fixture replay:** the three P1/P2 traces (calm, jittery, dropout) drive `SpiritAvatar` through the replay transport; assert the displayed mood sequence.
- **E2E (Playwright, optional MCP):** landing renders QR before three.js chunk loads; "watch a recorded haunting" shows a Revenant within 3 s; reduced-motion emulation renders no `<canvas>`.
- **Manual:** hallway test protocol (3 strangers, < 15 s) and Chrome performance trace at ≥ 55 fps.

## Correctness Properties (summary for Kiro PBT)

| ID | Property | Requirement |
|---|---|---|
| P-AV-1 | Orientation output is unit-norm and finite for all valid inputs | 1.4 |
| P-AV-2 | Reference pose maps to identity | 1.5 |
| P-AV-3 | Alpha wrap-around continuity | 1.6 |
| P-AV-4 | Smoothing never increases distance to target | 1.7 |
| P-AV-5 | Worse mood never yields higher mean glow or opacity | 3.4 |
| P-AV-6 | `moodVisuals` is total (finite outputs) | 3.4 |
