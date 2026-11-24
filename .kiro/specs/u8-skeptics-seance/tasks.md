# Implementation Tasks: Phase U8 — Skeptic's Séance

- [ ] 1. Core Environmental DSP Modules
  - [ ] 1.1 Implement 1–20 Hz infrasound bandpass and RMS energy in `packages/seance-core/src/dsp/band.ts`
  - [ ] 1.2 Implement rolling-shutter spatial light flicker analyzer in `packages/seance-core/src/dsp/spectrum-image.ts`
  - [ ] 1.3 Implement Claim Guard validator in `packages/seance-core/src/dsp/claim-guard.ts`
  - [ ] 1.4 Export modules in `packages/seance-core/src/dsp/index.ts` and `src/index.ts`
- [ ] 2. Property-Based Testing
  - [ ] 2.1 Test bandpass attenuation outside 1–20 Hz
  - [ ] 2.2 Test Claim Guard enforcement of forbidden phrases
  - [ ] 2.3 Test rolling-shutter banding detection on synthetic striped rows
- [ ] 3. Poltergeist Lab Skeptic Interface
  - [ ] 3.1 Implement `apps/poltergeist-lab/src/routes/SkepticRoute.tsx` with Infrasound, Light Flicker, Noise Floor audits, and Haunting Report
  - [ ] 3.2 Wire `/skeptic` into `App.tsx` and `Landing.tsx`
- [ ] 4. Verification & Dev Log
  - [ ] 4.1 Run `pnpm typecheck` and `pnpm test`
  - [ ] 4.2 Document in `docs/dev-log.md`
