# fixtures/traces — ghost traces

Real sensor recordings in the Séance `.seance` format (v1, UTF-8 JSON). They do three jobs:

1. **Regression tests.** Each trace with an `expected` block becomes a replay test via hook **H2** (`.kiro/hooks/h2-haunting-to-test.json`). Real-world data *is* the test suite.
2. **Replay mode.** Traces listed in `bundled.json` ship with Poltergeist Lab so laptop-only judges can run every experiment.
3. **Debugging with Kiro.** `seance-mcp` (`trace_stats`, `run_experiment`, `compare_traces`) reads these files.

Schema: see `phases/_shared/conventions.md` §7 in the planning workspace (`format`, `version`, `id`, `label`, `createdAt`, `experiment`, `device`, `clock`, `calibration`, `inputs`, `channels`, `expected`, `notes`).

---

## Naming

```
<UTC timestamp>_<experiment-id or 'raw'>_<short device or purpose tag>.seance
2026-11-28T10-12-40Z_pendulum-g_android.seance
2026-11-28T10-40-02Z_pendulum-g_cursed.seance
2026-11-22T09-05-11Z_raw_iphone-still.seance        ← Phase 1 sensor-reality recordings
```

- File name = the trace's `id` + `.seance`. Colons in times become hyphens (Windows-safe).
- Tags are generic (`android`, `iphone`, `pixel7`, `cursed`, `drop50`, `steel60`) — never a person's name.
- `.seance.gz` (gzip) is allowed for large audio-feature traces that are only bundled; H2 watches plain `.seance` files.

## Required metadata

| Field | Required | Notes |
|---|---|---|
| `format`, `version` | always | `"seance-trace"`, `1` |
| `id`, `createdAt`, `label` | always | `label` is human-readable ("Pendulum, 62 cm lanyard, bed") |
| `device` | always | `kind`, `platform`, coarse `userAgent` (browser + OS family), optional `model` |
| `clock` | when recorded via phone-bridge | `offsetMs`, `driftPpm`, `rttMs` |
| `experiment` | for experiment runs | `null` for raw Phase 1 recordings |
| `inputs` | for experiment runs | each `{ value, uncertainty, unit }` in SI |
| `channels` | always | per channel: `unit`, `axes`, `t` (ms from first sample, laptop clock), `data` (one array per axis) |
| `expected` | to become a test | `{ quantity, value, unit, tolerance }` — `tolerance` in the same unit |
| `notes` | optional | start with `cursed:` for intentionally bad runs (H2 skips them) |

For `audio.spectrum`, each axis label is the bin centre frequency in Hz (e.g. `"113.75"`), so analysis is pure from the file.

## How a trace becomes a test

1. Record a run in the Lab and mark it as a reference run (adds `expected` with the measured value and a tolerance you choose — usually about 2× the run's uncertainty, and never tighter than the accuracy target allows).
2. Get the file into this folder:
   - **Dev server:** "Save to fixtures" in the Lab's export menu, or
   - download the `.seance` file and move it here, or
   - (Phase 7+) ask Kiro to record one through `seance-mcp` `record_trace` — H2 fires automatically on the tool call.
3. If the file arrived from outside the editor, open it in Kiro and save once so H2's file trigger fires.
4. H2 writes `apps/poltergeist-lab/test/traces/<id>.replay.test.ts` and runs it. **Never loosen a tolerance to make a failing trace pass** — a failure means the code changed behaviour or the recording is bad; find out which.

## Bundled traces — `bundled.json`

Only traces listed here ship with the app (build fails if one is missing or invalid). Keep the set small and honest: 2 per experiment from at least 2 phones, plus 1 `cursed` example.

```json
{ "version": 1, "traces": [ { "id": "…", "experiment": "pendulum-g", "title": "…", "spookyTitle": "…", "device": "Android phone, Chrome", "role": "good", "blurb": "…" } ] }
```

## Privacy

- No names, accounts, locations or raw audio. Audio traces store band-limited spectrum frames and levels only.
- Strip the full user-agent string to browser + OS family before committing.
- Traces from other people (hallway tests, friends' phones) are committed **only with their permission**.
- Latitude/altitude inputs (local-gravity option) are removed from traces before committing.
