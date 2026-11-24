# Specification: Phase U9 — Polish, Evidence and Launch

## 1. Overview
Phase U9 brings the complete Séance platform to production-ready polish across all 10 monorepo packages and apps. It delivers new `create-seance-app` templates, verified accessibility and performance benchmarks, an empirical evidence dossier, and an honest, cited documentation overhaul.

## 2. Requirements & User Stories

### User Stories
- **US-1**: As a developer adopting Séance, I want `create-seance-app` to scaffold `ghost-ear` and `array` starter applications with a single command.
- **US-2**: As an educator or evaluator, I want an evidence dossier summarizing empirical device passports, user study protocols, real traces, and generated tests.
- **US-3**: As an open-source contributor, I want a comprehensive README with clear architectural diagrams, the laptop-only path, quickstarts, and a 4-file guide to adding experiments.

### Acceptance Criteria & System Shall Clauses
1. **WHEN** running `create-seance-app <dir> --template ghost-ear` or `--template array` **THE SYSTEM SHALL** scaffold functional workspace projects with proper dependencies and boilerplate.
2. **WHEN** verifying performance **THE SYSTEM SHALL** confirm join bundle size $\le 50$ kB gzip and report true measured numbers in `docs/perf.md`.
3. **WHEN** inspecting project documentation **THE SYSTEM SHALL** maintain an evidence directory (`docs/evidence/`) with study summaries, passport benchmarks, traces, and test generation details.
4. **WHEN** running test suites across the monorepo **THE SYSTEM SHALL** achieve 100% test pass rates across all packages with zero regressions.
