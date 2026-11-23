# Physics Rules

Mirror of `.kiro/steering/physics.md` + `units.md` in the Séance repo. Re-copy before publishing.

## Units
- Physical quantities are branded `Quantity<U>` types (`'m' | 's' | 'Hz' | 'rad' | 'rad/s' | 'm/s^2' | 'kg/m^3' | 'Pa' | 'GPa' | …`). Adding metres to seconds is a compile error.
- Convert once, at the edge: deg/s → rad/s, degrees → rad, cm/mm → m.

## Results
- Every result returns `{ value, uncertainty, unit, method, assumptions[] }`.
- Propagate independent relative uncertainties in quadrature. Report which term dominates.
- State confidence (`high | medium | low`) and warnings (e.g. jitter > 30% → low confidence).

## Formulas, sources and validity ranges
| Experiment | Model | Formula | Valid when |
|---|---|---|---|
| Pendulum g | Simple pendulum, large-amplitude correction | g = 4π²L/T₀², T ≈ T₀(1 + θ₀²/16); δg/g = √((δL/L)² + (2δT/T)²) | θ₀ ≲ 0.5 rad; phone ≈ point mass (otherwise physical-pendulum systematic error) |
| Free fall | Proper acceleration ≈ 0 in free fall | h = ½ g t² | Drop ≤ ~1 m; air drag negligible; detect the near-zero-|a| window |
| Slip angle | Static friction at slip onset | μₛ = tan θ; kinetic: a = g(sin θ − μₖ cos θ) | Slow tilt; θ measured from the gravity vector |
| Singing ruler | Euler–Bernoulli cantilever, first mode | f₁ = (β₁²/2π)√(EI/(ρA L⁴)), β₁L = 1.8751 → E = 48π² f₁² ρ L⁴ / (1.8751⁴ h²) | Rectangular section; L ≫ h; rigid clamp (clamp compliance lowers f₁) |
| Spin & find the chip | Centripetal acceleration | r = a/ω² (in-plane), direction of a points to the axis | Only near-constant-ω segments (|dω/dt| small), so tangential acceleration ≈ 0 |
| Damping decay | Logarithmic decrement | δ = (1/n) ln(x₀/xₙ), ζ = δ/√(4π² + δ²) | Light damping; amplitude well above the noise floor for all n cycles |

## Signal processing
- Resample to a uniform grid before FFT or period estimation. Report the jitter of the original timestamps.
- Prefer gyroscope zero-crossings for periods, with hysteresis. Average ≥ 10 oscillations.
- For FFT peaks, interpolate (parabolic on log magnitude) for sub-bin frequency resolution. Report the bin width.

## Tests
- Theory functions are pure. Each has a forward model and a property test showing that the inverse recovers the input within the reported uncertainty.
- Regression tests from traces assert against an independent `expected` value, never the measured one.
