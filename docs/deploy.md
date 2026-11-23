# Deployment Record — Production for Judges

This document records production configuration and deployment readiness for Séance.

## Endpoints

| Service | Technology | Host | Production URL |
|---|---|---|---|
| Poltergeist Lab | Vite React SPA | Cloudflare Pages / Vercel | `https://poltergeist-lab.pages.dev` |
| Banshee Choir | Vite React WebAudio SPA | Cloudflare Pages / Vercel | `https://banshee-choir.pages.dev` |
| Séance Relay | Node.js WebSocket (ws) | Render / Fly.io (Region: eu-central / us-east) | `wss://seance-relay.onrender.com` |

## Environment & Build Configuration

- `VITE_RELAY_URL`: Embedded at Vite build-time (`wss://seance-relay.onrender.com` for prod, `ws://localhost:4000` for dev).
- **SPA Rewrites**:
  - `apps/poltergeist-lab/public/_redirects`: `/* /index.html 200` (ensures `/join/:code` and `/replay` deep links resolve cleanly).
  - `apps/banshee-choir/public/_redirects`: `/* /index.html 200`.
- **Permissions-Policy**:
  `accelerometer=(self), gyroscope=(self), microphone=(self), wake-lock=(self)`
- **Cold Start Mitigation**:
  Free-tier idle sleep handled gracefully via client-side `SpiritTrouble` with "Waking the spirits..." backoff retry and immediate fallback to Replay Mode.

## Smoke Test Verification

| Check | Scenario | Expected Result | Status |
|---|---|---|---|
| S1 | Incognito Landing | Landing renders, QR code displays, zero console errors | PASS |
| S2 | Mobile Camera QR | Opens `/join/:code` in Safari (iOS) / Chrome (Android) | PASS |
| S3 | Begin Tap | Triggers single synchronous gesture for Motion/Orientation permission | PASS |
| S4 | Live Motion Link | Ghost rotates smoothly with < 150 ms latency | PASS |
| S5 | Replay Mode | 7 bundled traces produce calibrated physics results offline | PASS |
| S6 | Backgrounding | Visibility change triggers auto-pause, restores upon refocus | PASS |
| S7 | Invalid Code | Displays "This séance has ended" with Replay fallback | PASS |

