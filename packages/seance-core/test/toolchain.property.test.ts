// Phase 0 smoke test: proves Vitest + fast-check run in CI. Delete once real seance-core tests exist (Phase 2).
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

describe('toolchain', () => {
  it('runs property-based tests', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }), (x) => {
        expect(Math.abs(-x)).toBe(Math.abs(x));
      }),
    );
  });
});
