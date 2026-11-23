# Performance Benchmark & Budget Report

> **Status: PARTLY MEASURED.** Only the bundle sizes below are real (from `pnpm build` on the current code). Frame rate, latency and time-to-first-ghost have **not been measured yet**: measure them on real devices (method: Phase 10 perf budget) and fill them in.

## Budgets & Results

| # | Budget | Target | Measured | Pass? | Notes |
|---|---|---|---|---|---|
| **B1** | Possession view frame rate | 60 fps sustained (p5 ≥ 55 fps) | not measured | — | Measure with the Performance panel on a mid-range laptop |
| **B2** | Phone → screen latency (Wi-Fi) | < 150 ms median | not measured | — | Measure with clock-synced timestamps (phone-bridge test plan) |
| **B2** | Phone → screen latency (hotspot) | < 150 ms median | not measured | — | Same method over a phone hotspot |
| **B3** | Phone join route JS (gzip) | ≤ 50 kB gzip before the Begin tap | **23.21 kB gzip** (Join + SpiritTrouble + React runtime) | **PASS** | Code-split via React.lazy & Vite manualChunks; Three.js (10.6 kB) deferred |
| **B3** | Landing route JS (gzip) | ≤ 250 kB gzip | **89.60 kB gzip** (Landing + React + app shell) | **PASS** | |
| **B4** | Time to first ghost | Tap → ghost active ≤ 5 s | not measured | — | Time it in the hallway test |

## Bundle Breakdown (Production Build)

```
apps/poltergeist-lab/dist (pnpm build, code-split):
- assets/react-*.js: 50.64 kB (gzip: 17.82 kB) — shared React runtime
- assets/Join-*.js: 5.07 kB (gzip: 2.11 kB) — mobile join route
- assets/SpiritTrouble-*.js: 9.18 kB (gzip: 3.28 kB) — permission/error handling
- assets/Landing-*.js: 3.76 kB (gzip: 1.93 kB) — desktop summoning circle
- assets/three-*.js: 33.51 kB (gzip: 10.62 kB) — 3D avatar engine (deferred)
- assets/Possession-*.js: 12.59 kB (gzip: 4.67 kB) — 3D possession route (lazy)
- assets/ExperimentRunner-*.js: 30.70 kB (gzip: 9.87 kB) — lab runner (lazy)
- assets/index-*.js: 214.08 kB (gzip: 67.09 kB) — lab shell

apps/banshee-choir/dist:
- assets/index-*.js: 298.30 kB (gzip: 95.23 kB)
```

