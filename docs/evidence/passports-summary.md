# Device Passports Summary

## Empirical Profiles
Séance validates physical sensors through the WraithBench passport protocol (`/bench`).

### iPhone 15 Pro (Safari / iOS 17)
- **Path**: `fixtures/passports/iphone15-safari.json`
- **Nominal Sampling Rate**: 60.0 Hz
- **Observed Rate**: 59.88 Hz
- **Jitter CV**: 1.2% (pass $\le 5\%$)
- **Gyro Zero Bias**: $0.0028 \pm 0.0004\text{ rad/s}$
- **Noise Floor**: $0.0018\text{ m/s}^2$
- **Verdict**: `pass`

### Google Pixel 8 (Chrome / Android 14)
- **Path**: `fixtures/passports/pixel8-chrome.json`
- **Nominal Sampling Rate**: 100.0 Hz
- **Observed Rate**: 99.45 Hz
- **Jitter CV**: 2.1% (pass $\le 5\%$)
- **Gyro Zero Bias**: $0.0041 \pm 0.0006\text{ rad/s}$
- **Noise Floor**: $0.0025\text{ m/s}^2$
- **Verdict**: `pass`

## Calibration Ritual Invariants
- 6-orientation cube ritual validates that $|\mathbf{g}| = 9.81 \pm 0.15\text{ m/s}^2$ across all 6 faces ($\pm X, \pm Y, \pm Z$).
- Gyro still window confirms $||\boldsymbol{\omega}|| < 0.05\text{ rad/s}$ before initiating dynamic runs.
