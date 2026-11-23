# {{name}}

A Seance-powered physics lab, scaffolded with `create-seance-app`.

## Quick Start
```bash
pnpm install
pnpm dev
```

## Adding Experiments
1. Create a spec: `.kiro/specs/experiments/<id>/requirements.md`
2. Save it — Kiro hook H1 will scaffold the experiment code automatically
3. Implement the analysis in `src/experiments/<id>/analysis.ts`

## Architecture
- `seance-core`: sensor transport, trace recording, physics utilities
- `seance-avatars`: ghost visualization components
- `.kiro/`: steering docs, hooks, and experiment specs
