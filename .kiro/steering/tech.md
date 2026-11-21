---
inclusion: always
---
# Tech

## Stack
| Area | Choice |
|---|---|
| Language | TypeScript, `strict`, ES2022 modules, everywhere |
| Workspace | pnpm workspaces (`packages/*`, `apps/*`, `tools/*`) |
| Apps | Vite + React; three.js via `@react-three/fiber` + `@react-three/drei`; Framer Motion; uPlot for streaming charts |
| Audio | Web Audio API only (AnalyserNode, OscillatorNode, BiquadFilterNode, GainNode, DynamicsCompressorNode). No sample files |
| Relay | Node + `ws` (`packages/seance-relay`). WebSocket first; WebRTC data channel only if measured latency > 150 ms |
| MCP | `@modelcontextprotocol/sdk` (TypeScript), stdio transport (`packages/seance-mcp`) |
| Tests | Vitest + fast-check (property-based); Playwright for end-to-end |
| Hosting | Apps on static HTTPS hosting; relay on a Node host near the users |

Use the **context7** MCP server to check current library APIs before writing code against them. Don't rely on memory for library signatures.

## Versions (fill in on Phase 0 day, update when you upgrade)
| Tool | Version |
|---|---|
| Node.js | 22.15.1 (CI uses lts/*) |
| pnpm | 10.20.0 |
| TypeScript | 7.0.2 |
| Vitest | 5.1.1 (root `test.projects`) |
| fast-check | 4.10.3 |
| Vite | (Phase 4) |
| React | (Phase 4) |
| three / @react-three/fiber | (Phase 4) |
| ws | (Phase 3) |
| @modelcontextprotocol/sdk | (Phase 7) |
| Kiro IDE / kiro-cli | (fill in; kiro-cli not installed yet) |

## Commands
| Task | Command |
|---|---|
| Install | `pnpm install` |
| Type-check everything | `pnpm typecheck` |
| All tests once | `pnpm test` |
| Tests for one package | `pnpm --filter seance-core test` |
| One test file | `pnpm --filter seance-core exec vitest run test/units.property.test.ts` |
| Lab dev server (HTTPS, LAN) | `pnpm --filter poltergeist-lab dev -- --host` (port 5173) |
| Choir dev server | `pnpm --filter banshee-choir dev -- --host` (port 5174) |
| Relay dev server | `pnpm --filter seance-relay dev` (port 8787) |
| Build MCP server | `pnpm --filter seance-mcp build` → `packages/seance-mcp/dist/index.js` |
| Local HTTPS method | (write which: basic-ssl / mkcert / tunnel) |

Run commands from the repo root. On Windows, prefer `pnpm` scripts over shell-specific syntax.

## Performance budgets
- Possession view: **60 fps** on a mid-range laptop; no React re-render per sample (write samples into refs or typed arrays, render on `requestAnimationFrame`).
- Phone → laptop latency: **< 150 ms** median on the same Wi-Fi, measured with clock sync.
- Phone batching: send every ~50 ms; never one message per sensor event.
- Landing page: interactive in < 2 s on a mid-range phone over 4G; QR visible without scrolling.
- Choir: tilt → sound change < 100 ms on the laptop.

## Coding rules
- Physical values are `Quantity<Unit>` from `seance-core` units, never bare `number` (see `units.md` once it exists).
- Theory and analysis functions are **pure** (no DOM, no time, no randomness) so they can be property-tested and replayed.
- Convert browser units at the edge: `rotationRate` deg/s → rad/s, orientation degrees → rad.
- Every async device operation has explicit states and handles permission denial, disconnects and reconnects.
- No `any` in exported types. Prefer discriminated unions for messages and states.
- Keep dependencies few. Ask before adding a new runtime dependency to `seance-core` (it should stay close to zero-dependency).

## Environment variables
| Var | Used by | Example |
|---|---|---|
| `VITE_RELAY_URL` | apps | `wss://relay.example.com` |
| `PORT` | relay | `8787` |
| `SEANCE_RELAY_URL` | seance-mcp | `ws://localhost:8787` |
| `SEANCE_ROOM` | seance-mcp | `DEV1` (dev room; relay needs `ALLOW_PREFERRED_CODES=1`) |
| `SEANCE_OBSERVER_KEY` | seance-mcp + relay | shared secret that lets seance-mcp join a room as an observer |
