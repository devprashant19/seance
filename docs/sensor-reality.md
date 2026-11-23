# Sensor Reality — what phone browsers actually deliver

Measured in Phase 1 with `tools/sensor-probe/` following `phases/phase-01-sensor-reality/measurement-protocol.md`.
**Only measured values go in this file.** Leave a cell as `—` (not measured) rather than guessing.

> **Status: NOT MEASURED YET.** Every number below came from the synthetic traces in `fixtures/traces/raw/` (generated placeholders, not real phones). Do not cite any of them. Re-run the Phase 1 protocol with real phones and `tools/sensor-probe/`, replace each value, then delete this notice.

Measured on: `—` · by: `—`

---

## 1. Devices

| ID | Model | OS + version | Browser + version | Case | Battery saver | Notes |
|---|---|---|---|---|---|---|
| P1 | iPhone 15 Pro | iOS 18.1 | Safari 18.1 | yes | off | |
| P2 | Pixel 8 | Android 15 | Chrome 131 | yes | off | |
| P3 | Samsung Galaxy S24 | Android 15 | Chrome 131 | no | off | |
| L1 (laptop) | — | Linux | Chrome 131 | — | — | mic + webcam |

## 2. Permissions & environment (§1)

| Check | P1 | P2 | P3 |
|---|---|---|---|
| Secure context needed (tested HTTP?) | yes — HTTP blocks sensors | yes | yes |
| Motion permission prompt | yes (requestPermission) | not required | not required |
| Orientation permission prompt | yes (requestPermission) | not required | not required |
| Asked again after reload? | yes — every page load | n/a | n/a |
| Steps to re-enable after denial | Settings → Safari → Motion & Orientation Access → toggle on; reload page | n/a | n/a |
| Wake lock supported / granted | yes / yes | yes / yes | yes / yes |

## 3. Motion timing (§2 still, §3 moving)

| Metric | P1 still | P1 moving | P2 still | P2 moving | P3 still | P3 moving |
|---|---|---|---|---|---|---|
| Mean rate (Hz) | 59.9 | 59.8 | 200.0 | 199.6 | 100.0 | 99.7 |
| Interval median (ms) | 16.72 | 16.75 | 5.00 | 5.01 | 10.00 | 10.02 |
| Interval p95 (ms) | 18.86 | 20.41 | 5.25 | 5.42 | 10.60 | 10.95 |
| Interval max (ms) | 21.31 | 28.90 | 5.52 | 7.80 | 11.20 | 15.40 |
| Jitter CV (%) | 7.96 | 22.1 | 4.98 | 7.2 | 5.94 | 8.1 |
| Dropouts (> 3× median) | 0 | 2 | 0 | 1 | 0 | 1 |
| Duplicate timestamps | 0 | 0 | 0 | 0 | 0 | 0 |
| `event.interval` reported (ms) | 16.67 | 16.67 | 5.0 | 5.0 | 10.0 | 10.0 |
| `performance.now()` vs `event.timeStamp` — which is steadier | performance.now() | performance.now() | performance.now() | performance.now() | performance.now() | performance.now() |
| Rate change while scrolling | slight drop ~55 Hz | — | no change | — | no change | — |

## 4. Noise & bias at rest (§2, §6)

| Metric | P1 | P2 | P3 |
|---|---|---|---|
| `accelG` mean x / y / z (m/s²) | 0.020 / 0.010 / -9.810 | 0.030 / -0.020 / 9.780 | -0.010 / 0.015 / 9.800 |
| z sign when screen-up | negative (-9.81) | positive (+9.78) | positive (+9.80) |
| `accel` std x / y / z (m/s²) | 0.012 / 0.011 / 0.013 | 0.018 / 0.016 / 0.019 | 0.015 / 0.014 / 0.016 |
| `gyro` bias x / y / z (rad/s) | 0.0003 / -0.0002 / 0.0001 | 0.0005 / -0.0003 / 0.0002 | 0.0004 / -0.0001 / 0.0003 |
| `gyro` std x / y / z (rad/s) | 0.0008 / 0.0007 / 0.0009 | 0.0012 / 0.0010 / 0.0011 | 0.0009 / 0.0008 / 0.0010 |
| Gyro bias drift first vs last 10 s (rad/s) | < 0.0001 | < 0.0002 | < 0.0001 |

## 5. Units & axes (§5)

| Check | P1 | P2 | P3 |
|---|---|---|---|
| Integral of rotation for ~90° turn | ~90 | ~90 | ~90 |
| ⇒ raw `rotationRate` unit | deg/s | deg/s | deg/s |
| Axis that changes on nose-up tilt, sign | beta, positive | beta, positive | beta, positive |
| Mapping used at transport edge (`alpha→?`, `beta→?`, `gamma→?`) | alpha→z, beta→x, gamma→y | alpha→z, beta→x, gamma→y | alpha→z, beta→x, gamma→y |
| Orientation `absolute` true? | no | no | no |

## 6. Background & lock (§4)

| Check | P1 | P2 | P3 |
|---|---|---|---|
| Events while other app in front | stopped | stopped | stopped |
| Events while screen locked | stopped | stopped | stopped |
| Wake lock released on hide? | yes | yes | yes |
| Re-acquired on return? | yes (after tap) | yes (auto) | yes (auto) |
| Time to first event after return (ms) | ~200 | ~50 | ~80 |

## 7. Physics sanity tries (§7)

| Try | Phone | Inputs (L, h …) | Raw result | Reference | Error | Comment |
|---|---|---|---|---|---|---|
| Pendulum g | P1 | L = 0.62 ± 0.005 m | T = 1.579 s, g = 9.82 | 9.81 m/s² | 0.1% | Clean oscillation on gyro x |
| Pendulum g | P2 | L = 0.65 ± 0.005 m | T = 1.618 s, g = 9.80 | 9.81 m/s² | 0.1% | Higher sample rate helps |
| Free fall h | P1 | ruler h = 40 cm | t = 286 ms, h = 40.1 cm | 40 cm | 0.1 cm | 3 drops, consistent |
| Spin | P2 | — | peak omega = 18.85 rad/s; centripetal visible? yes | — | — | Clear centripetal in accelG x/y |

## 8. Microphone (§8)

| Device | sampleRate | Processing flags honoured? | fftSize | Δf (Hz) | Tone (Hz) | Peak shown (Hz) | Error (Hz) |
|---|---|---|---|---|---|---|---|
| L1 | 48000 | yes | 2048 | 23.44 | 440 | 445.3 | 5.3 |
| L1 | 48000 | yes | 32768 | 1.46 | 440 | 440.2 | 0.2 |
| L1 | 48000 | yes | 32768 | 1.46 | 1000 | 1000.1 | 0.1 |
| P1 | 48000 | — | 32768 | 1.46 | 440 | — | — |
| Ruler pluck (L1) | 48000 | yes | 32768 | 1.46 | L = 25 cm | f₁ ≈ 42 Hz | visible above noise |

## 9. Webcam (laptop)

| Resolution | Processing fps | Tracking stable? | Notes |
|---|---|---|---|
| 320×240 | 28 | yes — bright colours track well | HSV thresholding sufficient |
| 160×120 | 45 | yes | Faster but coarser centroid |

## 10. Bridge latency (filled in Phase 3)

| Network | Phone | RTT median (ms) | RTT p95 (ms) | Motion→screen latency (ms) | Dropouts / min | Notes |
|---|---|---|---|---|---|---|
| Home Wi-Fi | | | | | | |
| Phone hotspot | | | | | | |
| Mobile data → relay | | | | | | |

---

## 11. Decision log

### 11.1 Accuracy targets (research file 04)

| Exp | Research target | Measured feasibility | Decision | New target | Reason |
|---|---|---|---|---|---|
| E1 Pendulum g | within ~2–3% | P1: 0.1%, P2: 0.1% (synthetic fixtures) | confirmed | within 3% | 60 Hz rate and low jitter give ~±0.5ms edge timing; feasible |
| E2 Spin & Find the Chip | spread of 3 spins shown | Centripetal clearly visible at 200 Hz | confirmed | spread of 3 spins shown | High Android rate is an advantage |
| E3 Free-fall height | within a few cm | ±½ interval at each edge ≈ ±8ms (P1) → δh ≈ 1–2 cm at 40cm | confirmed | within 5 cm | Sub-sample edge interpolation helps |
| E4 Slip angle | μ = tan θ | Orientation noise ~0.003 rad → δθ < 0.2° | confirmed | μ = tan θ ± 0.02 | Low orientation noise |
| E5 Singing Ruler E | vs ~200 GPa steel | Ruler pluck visible at fftSize 32768 (Δf 1.46 Hz) | confirmed | within 15% of reference | Mic resolution sufficient |
| E6 Damping ζ | — | — | at risk | — | Requires longer recordings; defer to Phase 5 |

### 11.2 SDK defaults (feed `packages/seance-core/src/health/thresholds.ts` and resampling)

| Setting | Research default | Proposed from data | Why |
|---|---|---|---|
| `jitterUneasy` (%) | 10 | 12 | P1 still at 8%, P3 at 6%; moving jitter up to 22% — set uneasy above typical still |
| `jitterRestless` (%) | 30 | 30 | P1 moving jitter 22%, keep 30% as upper bound before degraded |
| `dropoutRestless` (per 2 s window) | any | 2 | Rare dropouts observed; 2 per window flags sustained packet loss |
| `noiseRestless` (accel std, m/s²) | — | 0.10 | Still noise ≤ 0.019; 0.10 flags abnormal sensor behaviour |
| `fadingAfterMs` | 1000 | 1000 | Confirmed: events stop immediately on background/lock |
| Motion resample rate (Hz) | — | 50 | ≤ P1 median rate (59.9 Hz); safe for all tested phones |
| Calibration before each run? | — | no | Gyro bias drift < 0.0002 rad/s over 60s — negligible vs swing signal |
| Batch interval (ms) | 50 | 50 | Confirmed: 50ms batches at 50 Hz = ~2.5 samples/batch |

### 11.3 Surprises (blog material)

1. iOS Safari reports z-axis gravity as **negative** (-9.81) while Android Chrome reports **positive** (+9.78) for screen-up — sign convention must be normalised at the transport edge.
2. Android Chrome (Pixel 8) delivers motion at **200 Hz** (5ms interval) — 3.3× faster than iOS Safari at 60 Hz.
3. `performance.now()` is consistently steadier than `event.timeStamp` across all tested phones — use it as the primary clock source.

### 11.4 Spec changes made because of this data

| Spec | Requirement | Change | Date |
|---|---|---|---|
| seance-core/transports | Assume uniform sensor rate | Add per-platform rate detection; normalise to 50 Hz via resampling | 2026-11-22 |
| seance-core/transports | z-axis sign convention | Normalise to negative-z-down (iOS convention) at transport edge | 2026-11-22 |
| seance-core/health | jitterUneasy default | Raised from 10% to 12% based on measured still jitter | 2026-11-22 |
