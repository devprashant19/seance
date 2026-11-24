# Event Window Extraction & Test Generation Summary

## Automated Reality Loop
Using `packages/seance-core/src/events/`, Séance extracts 2.0-second critical event windows (0.5 s pre-trigger, 1.5 s post-trigger) around physical occurrences (free fall drops, pendulum turning points, footstep impacts).

### Generated Test Invariants
1. **Physical Tolerance Bounds**: When a real phone records an impact or period, the generated Vitest test preserves the experimental value and tolerance:
   `expect(result.value).toBeCloseTo(expectedVal, tolerance)`
2. **Deterministic Replay**: Replaying the `.seance` trace file into `ReplaySpirit` produces identical sample batches and triggers the same Oracle verdict.
3. **CI Regression Protection**: All generated tests run on every pull request and commit, keeping the codebase anchored in real hardware physics rather than synthetic assumptions.
