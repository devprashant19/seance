---
inclusion: always
---
# Product: Séance

**One line:** Séance turns any phone into a laboratory instrument in five seconds, with no install and no hardware, and lets Kiro read live sensor data while it writes code.

## Who it is for
1. **Engineering and physics students** whose labs lack data-acquisition equipment (start with mechanical engineering: pendulum, free fall, cantilever stiffness, damping).
2. **Lab instructors** who want every student to run the experiment, not watch one shared setup.
3. **Makers, creative coders and web developers** who want hardware (phones, Arduino, BLE, MIDI) in a web app without learning each browser API.

## The product, in three parts
- **Séance SDK** (`packages/seance-core`): the skeleton. One `Spirit` interface for every device, unit-typed streams, ghost traces (record/replay), signal processing, and `defineExperiment` / `defineInstrument` plugins.
- **Poltergeist Lab** (`apps/poltergeist-lab`): guided experiments that compare measurement with theory, with honest uncertainty and an auto-generated lab notebook.
- **Banshee Choir** (`apps/banshee-choir`): a multiplayer instrument where every phone becomes a singing ghost.

## Non-negotiables
- **The judge path never breaks:** QR code → phone tap → ghost mirrors the phone → one experiment → choir. Check it after every change that touches the bridge, the landing page or an app shell.
- **No login, no install, no signup.** One tap on the phone, at most.
- **Laptop-only visitors can try everything** through replay mode (bundled ghost traces) and mouse-drag tilt.
- **The costume is the diagnostics.** Avatar mood (`calm / uneasy / restless / fading`) always reflects real signal health, and every spooky message has a plain-language line next to it.
- **Every physics result shows a unit and an uncertainty**, plus the method and the assumptions.
- **Original art and synthesized sound only.** No existing characters, no samples, no trademarks.
- **Accessible:** keyboard paths, screen-reader labels, reduced-motion variants, high-contrast "Daylight" theme.
- **Private by default:** no accounts; raw sensor data stays in the room; traces are saved only when the user presses Record; audio is analysed locally.

## Tone
Spooky but never confusing. Playful in the Choir, rigorous in the Lab. Short sentences. Example:
> "The spirit is restless." *Readings are arriving unevenly. Keep this tab open and the screen on.*

## Safety copy (always shown before motion experiments)
Use soft surfaces and low heights, tie knots securely, and never swing a phone near people or glass.

## What we are not building
Not an AI chatbot, not an MCP template, not a code reviewer. AI is optional ("Ask the Spirit") and the product works fully without it.
