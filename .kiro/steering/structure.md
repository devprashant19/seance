---
inclusion: always
---
# Structure

## Layout
```
.kiro/            specs, steering, hooks, agents, settings. Committed, never gitignored
packages/
  seance-core/      THE SKELETON: spirit, units, health, transports, sync, signal, trace, plugins
  seance-avatars/   React components that render spirits from health + streams
  seance-relay/     WebSocket room server for the phone bridge
  seance-mcp/       MCP server that lets Kiro list spirits, read streams, record and analyse traces
apps/
  poltergeist-lab/  App 1: guided experiments (Skeleton Crew app #1)
  banshee-choir/    App 2: multiplayer motion-to-music (Skeleton Crew app #2)
tools/            throwaway or internal tools (e.g. tools/sensor-probe). Never shipped as an app
fixtures/traces/  *.seance ghost traces. Each one with `expected` becomes a regression test
power/            the Séance Kiro Power (plugin.json, mcp.json, skills/)
scripts/          repo scripts, including scripts/kiro/* used by hooks
docs/             kiro-journal.md, sensor-reality.md, vibe-vs-spec.md, architecture.md, evidence/
  plan/           LOCAL ONLY (gitignored): the build plan. READ-ONLY reference; phase files to copy in live under docs/plan/phase-NN-*/copy-into-repo/
```

## Import rules (enforced by hook H5 from Phase 7)
- `apps/*` may import only package entry points: `seance-core`, `seance-avatars` (and their documented subpath exports). Never `seance-core/src/...`, and never raw browser device APIs (`DeviceMotionEvent`, `getUserMedia`, `navigator.serial` …). Those belong in `seance-core` transports.
- `seance-avatars` may import `seance-core` types and streams, never transports directly.
- `seance-core` has no React and no DOM rendering. Browser APIs appear only inside `src/transports/` and `src/platform/`.
- `seance-mcp` and `seance-relay` run on Node; they may import `seance-core` pure modules (`units`, `trace`, `signal`, `plugins`) but not browser transports.

## Where new things go
| Adding… | Put it in |
|---|---|
| A new device type | `packages/seance-core/src/transports/<name>/` + contract test in `test/transports/<name>.contract.test.ts` |
| A new experiment | Write `.kiro/specs/experiments/<id>/requirements.md` first. Hook H1 scaffolds `apps/poltergeist-lab/src/experiments/<id>/` |
| A new signal routine | `packages/seance-core/src/signal/<name>.ts` + `test/signal/<name>.property.test.ts` |
| A new avatar | `packages/seance-avatars/src/<spirit-kind>/` with a reduced-motion variant |
| A new Choir scale/instrument | `apps/banshee-choir/src/instruments/` via `defineInstrument` |
| A recorded trace | `fixtures/traces/<id>.seance` (see `fixtures/traces/README.md`) |

## Naming
- Files: `kebab-case.ts`; React components `PascalCase.tsx`.
- Tests: `*.test.ts` (unit), `*.property.test.ts` (fast-check), `*.contract.test.ts` (Spirit contract), `*.replay.test.ts` (generated from traces by H2).
- Spirit kinds, transports, channels, moods and experiment ids use exactly the names in the project conventions: `poltergeist banshee watcher golem wisp organist revenant`; `phone-bridge local serial bluetooth midi mock replay`; `calm uneasy restless fading`; `pendulum-g free-fall singing-ruler spin-find-chip slip-angle damping-decay`.

## Specs map
| Spec | Covers | Phase |
|---|---|---|
| `seance-core` | the SDK | 2 |
| `phone-bridge` | relay, rooms, QR, streaming, clock sync | 3 |
| `avatars-and-moods` | possession view, avatars, mood system | 4 |
| `poltergeist-lab` | Lab app shell, Oracle, replay mode, notebook | 5 |
| `experiments/<id>` | one experiment each; read by hook H1 | 5, 8 |
| `banshee-choir` | Choir app | 6 |
| `seance-mcp` | MCP server | 7 |
