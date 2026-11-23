# {{title}} — Lab Notebook

## Where Does the Spirit Live? (Spin & Find the Chip)

**Date:** {{date}}
**Device:** {{device}}

---

## Aim

Locate the IMU (inertial measurement unit) sensor inside the phone body by exploiting rigid-body kinematics during a planar spin.

## Apparatus

- Phone with gyroscope and accelerometer
- Smooth, level table surface
- Phone outline dimensions: {{phoneWidth}} m × {{phoneHeight}} m

## Theory

<!-- formulas:start -->
When a phone spins on a table with angular velocity ω and angular acceleration α, the accelerometer at offset **r** = (rₓ, rᵧ) from the spin axis measures:

- aₓ = −ω² rₓ − α rᵧ
- aᵧ = α rₓ − ω² rᵧ

Solving the 2×2 system:

- rₓ = (−ω² aₓ + α aᵧ) / (ω⁴ + α²)
- rᵧ = (−α aₓ − ω² aᵧ) / (ω⁴ + α²)

When α ≈ 0 (steady spin): rₓ ≈ −aₓ/ω², rᵧ ≈ −aᵧ/ω²

Distance: |r| = √(rₓ² + rᵧ²)
<!-- formulas:end -->

## Method

1. Placed the phone face-up on a smooth table and held still for 2 seconds (rest bias calibration).
2. Spun the phone like a bottle, waited for it to slow naturally.
3. Repeated two more times for a total of 3 spins.
4. The app detected spin segments where |ω_z| ≥ 6 rad/s and solved for the sensor position.

## Results

**Primary measurement:** {{primary}}

- rₓ = {{rx}} m
- rᵧ = {{ry}} m
- Distance from top edge: {{fromTopEdge}} mm
- Distance from left edge: {{fromLeftEdge}} mm

## Uncertainty

δr/r ≈ √((δa/a)² + (2δω/ω)²)

Gyroscope errors count double because ω appears squared in the centripetal term.

## Assumptions

1. Vertical spin axis fixed relative to the phone
2. Spin axis ≈ centre of mass ≈ geometric outline centre
3. No sliding or translation during spin
4. Accelerometer and gyroscope co-located on one IMU package
5. Gyro and accel samples are time-aligned
