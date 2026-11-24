# Tasks — Phase U1: seance-sonify + Ghost Ear MVP

- [ ] **Task 1.1: Scaffold `packages/seance-sonify`**
  - Create `package.json`, `tsconfig.json`, `tsconfig.build.json`.
  - Add `seance-sonify` to pnpm workspace and root build/test scripts.

- [ ] **Task 1.2: Implement `mapping.ts` with Property Tests**
  - Pure functions: `mapToTone(x, range, sigma, opts)`.
  - Property tests with `fast-check` (Property 1: Monotonic Pitch, Property 2: Frequency Bounds, Property 3: Tremolo Monotonicity).

- [ ] **Task 1.3: Implement `earcons.ts` with Property Tests**
  - Pure functions: `earconsForTrace()`, `getEarconParams()`.
  - Property tests for zero-crossing fidelity and hysteresis handling.

- [ ] **Task 1.4: Implement `speech.ts` with Tests**
  - Pure formatter: `resultSentence()`, unit expansions ("metres per second squared", etc.).
  - DOM speech helper with `aria-live` announcer mirroring.
  - Property tests for deterministic speech generation.

- [ ] **Task 1.5: Implement `limiter.ts` with Property Tests**
  - Pure compressor gain math + WebAudio node factory.
  - Property tests verifying output never exceeds 0.5.

- [ ] **Task 1.6: Implement `scrub.ts` with Property Tests**
  - Pure orientation roll / keyboard step to buffer index mapping.
  - Property tests verifying bounds `[0, N-1]`.

- [ ] **Task 1.7: Implement `engine.ts` (WebAudio Graph)**
  - WebAudio synthesis: dual oscillator, tremolo LFO, noise buffer, earcon player, dynamics limiter.

- [ ] **Task 1.8: Ghost Ear Route in Poltergeist Lab (`/hear`)**
  - Build `GhostEarRoute.tsx`, `useGhostEar.ts`, `keyboard.ts`, `Announcer.tsx`.
  - Add route `/hear` to `apps/poltergeist-lab/src/App.tsx`.
  - Add "Hear this result" button in `OraclePanel.tsx`.

- [ ] **Task 1.9: Add Sonification Tools to `seance-mcp`**
  - Implement `accessible_result` and `audit_sonification` tools in `packages/seance-mcp`.
  - Add unit tests in `packages/seance-mcp/test/`.

- [ ] **Task 1.10: Full Verification & Dev Log Update**
  - Run `pnpm typecheck`, `pnpm test`, and package builds.
  - Record Session 3 in `docs/dev-log.md`.
