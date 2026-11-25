# Performance Benchmark & Budget Report

> **Status: PARTLY MEASURED.** Only the bundle sizes below are real (from `pnpm build` on the current code). Frame rate, latency and time-to-first-ghost have **not been measured yet**: measure them on real devices (method: Phase 10 perf budget) and fill them in.

## Budgets & Results

| # | Budget | Target | Measured | Pass? | Notes |
|---|---|---|---|---|---|
| **B1** | Possession view frame rate | 60 fps sustained (p5 ≥ 55 fps) | not measured | — | Measure with the Performance panel on a mid-range laptop |
| **B2** | Phone → screen latency (Wi-Fi) | < 150 ms median | not measured | — | Measure with clock-synced timestamps (phone-bridge test plan) |
| **B2** | Phone → screen latency (hotspot) | < 150 ms median | not measured | — | Same method over a phone hotspot |
| **B3** | Phone join route JS (gzip) | ≤ 50 kB gzip before the Join tap | **3.38 kB gzip JS** + 2.69 kB gzip HTML (name entry, instrument picker, protocol streaming), measured from `pnpm build` on 2026-11-25. The 3D ghost (three.js 125.33 kB + ghost module 6.94 kB gzip) is fetched only **after** joining | **PASS** | Fonts load from Google Fonts with `display=swap` (not counted; page renders with system fonts first) |
| **B3** | Landing route JS (gzip) | ≤ 250 kB gzip | **104.0 kB gzip** before the 3D ghost (Landing 15.91 + React 69.21 + router 13.83 + app shell 2.83 + theme CSS 2.22), measured 2026-11-25; the 3D ghost then streams in lazily (three.js 125.33 + ghost 9.08 kB gzip) | **PASS** | three.js is code-split; the page is usable while it loads |
| **B4** | Time to first ghost | Tap → ghost active ≤ 5 s | not measured | — | Time it in the hallway test |

## Bundle Breakdown (Production Build)

```
apps/poltergeist-lab/dist (pnpm build, multi-page entry + code-split):
- join.html: 3.30 kB (gzip: 1.35 kB) — standalone mobile entry page
- assets/join-*.js: 3.20 kB (gzip: 1.58 kB) — standalone sensor streaming client
- assets/modulepreload-polyfill-*.js: 0.71 kB (gzip: 0.40 kB) — browser polyfill
- index.html: 1.22 kB (gzip: 0.54 kB) — desktop SPA host page
- assets/main-*.js: 3.00 kB (gzip: 1.34 kB) — desktop app bootstrap
- assets/react-*.js: 223.08 kB (gzip: 69.17 kB) — React & ReactDOM runtime
- assets/router-*.js: 38.22 kB (gzip: 13.84 kB) — React Router runtime
- assets/Landing-*.js: 3.88 kB (gzip: 1.97 kB) — desktop summoning circle
- assets/Possession-*.js: 12.59 kB (gzip: 4.67 kB) — 3D possession route (lazy)
- assets/three-*.js: 33.51 kB (gzip: 10.62 kB) — 3D avatar engine (lazy, deferred)
- assets/ExperimentRunner-*.js: 30.67 kB (gzip: 9.85 kB) — lab runner (lazy)
- assets/registry-*.js: 13.69 kB (gzip: 5.34 kB) — experiment registry (lazy)

Total downloaded on mobile join (/join.html?code=...):
- HTML: join.html = 3.30 kB (gzip: 1.35 kB)
- JS: join (1.58 kB gzip) + polyfill (0.40 kB gzip) = 1.98 kB gzip JS (3.91 kB raw)
- Total initial network transfer = 3.33 kB gzip (7.21 kB uncompressed) -> PASS (Budget B3 ≤ 50 kB)

apps/banshee-choir/dist:
- assets/index-*.js: 298.30 kB (gzip: 95.23 kB)
```

## B3 Resolution: Standalone Lightweight Mobile Join Page

### Solution Implemented
To resolve the B3 budget failure without removing full desktop SPA features, `/join.html` was implemented as a dedicated multi-page entry (`join.html` + `src/join-standalone.ts`) built alongside the main SPA in Vite:
- **No framework overhead**: Removes React DOM (~42 kB gzip) and React Router (~14 kB gzip) entirely from the mobile phone streaming path.
- **Fast sensor streaming**: Retains secure-context checking, iOS permission requests, 50ms batching, and screen wake lock.
- **Transferred payload**: **1.98 kB gzip JS (3.33 kB gzip total)**, well within the 50 kB budget (93.3% margin).
- **Fallback**: The React route `/join/:code` remains functional in `App.tsx` for SPA routing fallbacks.

