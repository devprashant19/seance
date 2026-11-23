---
name: seance-hardware
description: Use when adding phone or device sensors (accelerometer, gyroscope, orientation, microphone, camera, Web Serial, Web Bluetooth, Web MIDI) to a web app, or when debugging sensor permissions, sample rates, jitter, dropouts, latency or reconnection. Covers the Séance Spirit contract and the seance MCP tools for observing live devices.
---

# Séance Hardware Skill

Séance treats every device as a **spirit** with one contract: `summon()`, `banish()`, `stream(channel)`, `capabilities`, `health()`, `on('state' | 'health' | 'error')`. A phone joins a laptop page by scanning a QR code, with no install.

## Before writing sensor code
1. Read `references/transports-rules.md` (rules every transport follows) and `references/browser-support.md` (what works where).
2. If the `seance` MCP server is connected, **look at real data first**:
   - `list_spirits` shows who's connected and their health (rate, jitter, dropouts, mood).
   - `read_stream` with `waitForFresh: true` watches a live behaviour.
   - `trace_stats` gives the timing and noise of a recorded `.seance` trace.

## The rules that catch most bugs
- **HTTPS only.** Motion sensors and the microphone are blocked on plain HTTP (localhost excepted). For phone testing on a LAN, use a self-signed dev certificate or a tunnel.
- **iOS needs a tap.** Call `DeviceMotionEvent.requestPermission()` and `DeviceOrientationEvent.requestPermission()` *inside* a click/touch handler, and handle `"denied"` with a visible message.
- **Units at the edge.** `rotationRate` is deg/s and orientation angles are degrees. Convert to rad/s and rad once, where the event is read. `acceleration` excludes gravity; `accelerationIncludingGravity` includes it.
- **Timestamps, not arrival times.** Compute rate and jitter from sample timestamps. Browsers may batch events, and batching is not a dropout.
- **Batch about 50 ms** of samples per network message. Never send one message per event.
- **Keep the phone awake.** Use the Screen Wake Lock API where available, warn otherwise, and expect throttling when the tab is hidden.
- **Reconnect resumes the same spirit.** After a screen lock or network blip, keep the same id and mark the gap, rather than creating a new device.
- **Vibration and Web Serial/Bluetooth/MIDI are not universal.** Feature-detect, and label them "Chromium bonus" in the UI.

## Live mode for the MCP server
By default this power starts `seance-mcp` in **offline** mode: it reads `fixtures/traces/*.seance` in the current project. Kiro namespaces a power's servers on install, so to observe live devices, run a Séance relay and add a separate live server in your workspace `.kiro/settings/mcp.json`:

```json
{ "mcpServers": { "seance-live": { "command": "npx", "args": ["-y", "seance-mcp@0.1.0", "--relay", "ws://localhost:8787", "--room", "DEV"] } } }
```

## Health → mood (for UIs that show signal quality)
| Mood | Typical condition |
|---|---|
| calm | jitter < 10%, no dropouts, calibrated |
| uneasy | jitter 10–30% or not calibrated |
| restless | dropouts or high noise floor |
| fading | no data for > 1 s |

Always pair a themed mood with a plain-language explanation of what is wrong and what to do.
