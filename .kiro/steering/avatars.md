---
inclusion: fileMatch
fileMatchPattern: ["packages/seance-avatars/**", "apps/**/src/**/*.tsx"]
---
# Avatar & UI rules

## The costume is the diagnostics
- Mood (`calm` / `uneasy` / `restless` / `fading`) comes **only** from `HealthReport.mood` produced by `seance-core` (`health/thresholds.ts`). Never compute or hard-code mood thresholds in avatar or app code.
- Visual parameters come from the pure function `moodVisuals(mood, health)` in `seance-avatars/src/mood/visuals.ts`. Add new visual behaviour there, with a property test, not inline in a component.
- Every themed message ships with a plain-language line (`{ spooky, plain }` in the copy deck). Never show a spooky line alone.
- Mood is shown by icon shape + text label + colour — never colour alone.

## Reduced motion is mandatory
- Every avatar has a static 2D variant. Any new avatar or animation must check `useReducedMotion()` and provide the calm version in the same change.
- Calm mode: no WebGL, no particles, no trails, no float; orientation as roll-only rotation at ≤ 10 Hz plus numeric readouts with units.

## Performance budget (60 fps, mid-range laptop)
- ≤ 4 ms avatar JavaScript per frame, ≤ 12 draw calls, ≤ 20k triangles, one point light, no shadows, no post-processing bloom.
- Per-sample data goes into refs and is read in `useFrame`; React state changes only on mood/state transitions.
- No allocations inside `useFrame` (reuse `Vector3`/`Quaternion` instances); pre-allocate buffer geometries.
- Clamp DPR to 1.5; pause rendering when `document.hidden`.

## Orientation maths
- Use the pipeline in `seance-avatars/src/orientation/`: device→earth (Z–X′–Y″), earth→three world, reference pose, heading normalisation, slerp smoothing with spike clamp. Don't add ad-hoc Euler maths in components.
- Inputs are radians (the phone bridge converts degrees at the edge).

## Art and sound
- Original artwork only. No existing characters, logos, fonts with restrictive licences, or stock 3D models.
- Sound effects are synthesized with Web Audio (no audio files).

## Accessibility
- Interactive elements are keyboard-reachable with visible focus; avatars have `role="img"` and a label naming the spirit and its mood.
- Mood changes are announced via `aria-live="polite"`, throttled to once per 5 s.
- Text contrast meets WCAG AA on the dark theme and on the Daylight theme.

## Public API only
- Apps import from `seance-core` and `seance-avatars` entry points only — never from `.../src/...`.
