# Séance 👻

**Turn any phone into a laboratory instrument in five seconds. No install, no hardware. And Kiro can read the live sensor data while it writes the code.**

![CI](https://github.com/devprashant19/seance/actions/workflows/ci.yml/badge.svg)
Kiroween 2026 · **Skeleton Crew** · MIT

> 🚧 Work in progress for Kiroween 2026.

## What's in here

| Path | What it is |
|---|---|
| `packages/seance-core` | **The skeleton.** One `Spirit` interface for phones, mics, webcams, Arduino, BLE and MIDI; unit-typed streams; ghost-trace record/replay; signal processing; `defineExperiment` / `defineInstrument` |
| `packages/seance-avatars` | Ghost avatars whose mood shows real signal health |
| `packages/seance-relay` | Room server that links a phone to a laptop by QR code |
| `packages/seance-mcp` | MCP server that lets Kiro list devices, read live streams and record traces |
| `apps/poltergeist-lab` | App 1: measure g with a swinging phone, hear a ruler's stiffness, find the chip inside your phone |
| `apps/banshee-choir` | App 2: every phone in the room becomes a singing ghost |
| `.kiro/` | Specs, steering, hooks, custom agents and MCP config used to build all of the above |
| `power/` | The Séance Kiro Power |

## Develop

```bash
corepack enable
pnpm install
pnpm test
pnpm dev:relay   # terminal 1
pnpm dev:lab     # terminal 2 → open the HTTPS LAN URL on your laptop, scan the QR with your phone
```

## License

MIT, see `LICENSE`.
