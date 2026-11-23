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

## Architecture

```
Phone (sensors) → WSS → Relay (seance-relay) → WSS → Laptop (poltergeist-lab / banshee-choir)
```

## Relay Details

- **Package**: `packages/seance-relay`
- **Entry**: `dist/main.js` (build with `pnpm -F seance-relay run build`)
- **Port**: reads `PORT` env var (default 4000)
- **Origin control**: reads `ALLOWED_ORIGINS` env var (comma-separated)
- **Health**: `GET /healthz` → `{"status":"ok","rooms":N}`
- **Heartbeat**: pings all clients every 20s to keep proxy connections alive
- **Limits**: 8 peers/room, 60 msg/s rate limit, 64KB max frame, 4-hour room expiry

## Deploy Steps

### Relay (Render / Railway / Fly.io)

1. Point to repo, set root to `packages/seance-relay`
2. Build: `pnpm install && pnpm -F seance-relay run build`
3. Start: `node dist/main.js`
4. Set env: `PORT`, `ALLOWED_ORIGINS`

### Apps (Vercel / Netlify / Cloudflare Pages)

1. Point to repo
2. Set root to `apps/poltergeist-lab` or `apps/banshee-choir`
3. Build: `pnpm install && pnpm -F <name> run build`
4. Output dir: `dist`
5. Set env: `VITE_RELAY_URL=wss://your-relay-host`
6. SPA fallback: `vercel.json` rewrites, Netlify `_redirects`, or Cloudflare Pages default SPA mode

## Configuration Record

| Item | Value |
|---|---|
| Lab URL | `https://poltergeist-lab.pages.dev` |
| Choir URL | `https://banshee-choir.pages.dev` |
| Relay URL | `wss://seance-relay.onrender.com` |
| Relay host + region | Render / us-east |
| Relay sleeps when idle? | Yes → mitigation: "Waking the spirits..." + replay fallback |
| Allowed origins | Lab + Choir production URLs, localhost:5173, localhost:5174 |
| Build env vars | `VITE_RELAY_URL=wss://seance-relay.onrender.com` |
| Deployed commit / tag | _fill after deploy_ |
| Deployed at (date, time, TZ) | _fill after deploy_ |

## Smoke Test Verification

| Check | Scenario | Expected Result | Status |
|---|---|---|---|
| S1 | Incognito Landing | Landing renders, QR code displays, zero console errors | not run yet |
| S2 | Mobile Camera QR | Opens `/join/:code` in Safari (iOS) / Chrome (Android) | not run yet |
| S3 | Begin Tap | Triggers single synchronous gesture for Motion/Orientation permission | not run yet |
| S4 | Live Motion Link | Ghost rotates smoothly with < 150 ms latency | not run yet |
| S5 | Replay Mode | 7 bundled traces produce calibrated physics results offline | not run yet |
| S6 | Backgrounding | Visibility change triggers auto-pause, restores upon refocus | not run yet |
| S7 | Invalid Code | Displays "This séance has ended" with Replay fallback | not run yet |

