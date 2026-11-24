# Performance Benchmark & Budget Report

> **Status: PARTLY MEASURED.** Only the bundle sizes below are real (from `pnpm build` on the current code). Frame rate, latency and time-to-first-ghost have **not been measured yet**: measure them on real devices (method: Phase 10 perf budget) and fill them in.

## Budgets & Results

| # | Budget | Target | Measured | Pass? | Notes |
|---|---|---|---|---|---|
| **B1** | Possession view frame rate | 60 fps sustained (p5 ≥ 55 fps) | not measured | — | Measure with the Performance panel on a mid-range laptop |
| **B2** | Phone → screen latency (Wi-Fi) | < 150 ms median | not measured | — | Measure with clock-synced timestamps (phone-bridge test plan) |
| **B2** | Phone → screen latency (hotspot) | < 150 ms median | not measured | — | Same method over a phone hotspot |
| **B3** | Phone join route JS (gzip) | ≤ 50 kB gzip before the Begin tap | **90.30 kB gzip** (278.97 kB raw; 90.80 kB total incl HTML) | **FAIL** | Entry shell (`index` 67.09 kB) + `react` (17.82 kB) + `Join` (2.11 kB) + `SpiritTrouble` (3.28 kB). Exceeds 50 kB budget by 40.3 kB. |
| **B3** | Landing route JS (gzip) | ≤ 250 kB gzip | **89.60 kB gzip** (Landing + React + app shell) | **PASS** | |
| **B4** | Time to first ghost | Tap → ghost active ≤ 5 s | not measured | — | Time it in the hallway test |

## Bundle Breakdown (Production Build)

```
apps/poltergeist-lab/dist (pnpm build, code-split):
- assets/index-*.js: 214.08 kB (gzip: 67.09 kB) — entry shell & react-dom client
- assets/react-*.js: 50.64 kB (gzip: 17.82 kB) — React & React Router runtime
- assets/SpiritTrouble-*.js: 9.18 kB (gzip: 3.28 kB) — permission/error handling modal
- assets/Join-*.js: 5.07 kB (gzip: 2.11 kB) — mobile join route component
- assets/Landing-*.js: 3.76 kB (gzip: 1.93 kB) — desktop summoning circle
- assets/Possession-*.js: 12.59 kB (gzip: 4.67 kB) — 3D possession route (lazy)
- assets/three-*.js: 33.51 kB (gzip: 10.62 kB) — 3D avatar engine (lazy, deferred)
- assets/ExperimentRunner-*.js: 30.70 kB (gzip: 9.87 kB) — lab runner (lazy)
- assets/registry-*.js: 12.36 kB (gzip: 4.85 kB) — experiment registry (lazy)

Total downloaded on /join/:code:
- HTML: index.html = 1.05 kB (gzip: 0.50 kB)
- JS: index (67.09 kB) + react (17.82 kB) + Join (2.11 kB) + SpiritTrouble (3.28 kB) = 90.30 kB gzip (278.97 kB raw)
- Total initial network transfer = 90.80 kB gzip (280.02 kB uncompressed) -> FAIL (Budget B3 ≤ 50 kB)

apps/banshee-choir/dist:
- assets/index-*.js: 298.30 kB (gzip: 95.23 kB)
```

## B3 Entry Chunk Analysis & Shrinkage Proposals

### Root Cause
In the current single-page architecture, every route must download the entry `index-*.js` (67.09 kB gzip) and `react-*.js` (17.82 kB gzip) before React can evaluate routes. The entry chunk contains `react-dom/client`, `react/jsx-runtime`, and the core router shell. Because React DOM + React Router alone exceed 80 kB gzip, **no single-page React bundle sharing the main SPA root can satisfy the ≤ 50 kB gzip budget on `/join/:code`**.

### Proposals to Shrink Entry Chunk to Fit ≤ 50 kB Budget

1. **Dedicated Standalone Join Page (Recommended — Expected: ~8–12 kB gzip)**:
   - Separate `/join/:code` into an independent lightweight Vite multi-page entry (`join.html`) or vanilla JS page.
   - The phone join client only requires `PhoneClient` from `seance-core/transports/phone-bridge`, motion/orientation event listeners, and minimal DOM cards (PIN display, calibrate button, stream status).
   - Eliminating the desktop SPA React DOM runtime on mobile drops the initial transfer to **under 15 kB gzip** (well within the ≤ 50 kB budget).

2. **Preact Aliasing for Mobile Route (Expected: ~18–25 kB gzip)**:
   - Alias `react` and `react-dom` to `preact/compat` specifically for the join bundle, replacing the 83 kB gzip React DOM runtime with Preact's ~10 kB gzip runtime.

3. **Vite Dynamic Entry Splitting**:
   - Split `react-router-dom` out of the initial critical path; use a tiny router dispatch script that only imports React and the Join route when on `/join/*`.

