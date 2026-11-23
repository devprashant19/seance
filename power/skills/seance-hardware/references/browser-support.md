# Browser Support

**Fill from `docs/sensor-reality.md` (Phase 1 measurements) before publishing the power.** The rows below are the research plan's general-knowledge starting point. Replace "expected" with what you measured, and add the devices and browser versions you tested.

| Capability | Android Chrome | iOS Safari | Desktop Chrome/Edge | Desktop Firefox | Desktop Safari |
|---|---|---|---|---|---|
| DeviceMotion / Orientation | expected yes | expected yes (permission tap, HTTPS) | laptops usually lack sensors | — | — |
| Microphone (getUserMedia) | expected yes | expected yes | yes | yes | yes |
| Camera | expected yes | expected yes | yes | yes | yes |
| Vibration API | expected yes | no | — | — | — |
| Screen Wake Lock | expected yes | recent iOS versions | yes | check | check |
| Web Serial | limited | no | yes | check current status | no |
| Web Bluetooth | yes (Android) | no | yes | no | no |
| Web MIDI | yes | no | yes | check current status | no |

## Measured (replace with your Phase 1 numbers)

| Device | OS / browser | Motion rate (Hz) | Jitter % | Dropouts / min | Notes |
|---|---|---|---|---|---|
| … | … | … | … | … | … |
