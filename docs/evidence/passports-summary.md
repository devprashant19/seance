# Device Passports Summary

## Synthetic Benchmark Profiles
> **Notice**: No physical passport measurements have been captured from real hardware yet. The passport files below (`iphone15-safari.json` and `pixel8-chrome.json`) are synthetic reference fixtures generated to validate the WraithBench schema, calibration algorithms, and regression test suites.

### Synthetic Reference: Apple iPhone 15 Pro Profile (Safari / iOS)
- **Path**: `fixtures/passports/iphone15-safari.json`
- **Type**: Synthetic fixture for protocol testing
- **Nominal Sampling Rate**: 60.0 Hz
- **Simulated Jitter CV**: 4.1%
- **Status**: Synthetic example fixture (empirical hardware run pending)

### Synthetic Reference: Google Pixel 8 Profile (Chrome / Android)
- **Path**: `fixtures/passports/pixel8-chrome.json`
- **Type**: Synthetic fixture for protocol testing
- **Nominal Sampling Rate**: 50.0 Hz
- **Simulated Jitter CV**: 6.8%
- **Status**: Synthetic example fixture (empirical hardware run pending)

## Calibration Ritual Protocol
- 6-orientation cube ritual validates that $|\mathbf{g}| = 9.81 \pm 0.15\text{ m/s}^2$ across all 6 faces ($\pm X, \pm Y, \pm Z$).
- Gyro still window confirms $||\boldsymbol{\omega}|| < 0.05\text{ rad/s}$ before initiating dynamic runs.
