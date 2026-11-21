# Vibe coding vs spec-driven: a measured comparison

The write-up asks how spec-driven development compared with vibe coding. Answer with numbers from two features of similar size, built both ways.

| | Feature A, vibe-coded | Feature B, spec-driven |
|---|---|---|
| Feature | Leaderboard of the Damned (Phase 8) | (pick a same-size feature in Phase 5, e.g. CSV export + data table, or the free-fall experiment) |
| Rough size (files / LOC at the end) | | |
| Prompts / iterations to "works" | | |
| Wall-clock time to "works" | | |
| Bugs found after "works" (first 24 h) | | |
| Rework (lines changed after "works") | | |
| Tests at the end (unit / property) | | |
| Would I trust it in the judge path? | | |
| Notes | | |

**Method:** start a timer when the first prompt is sent; stop it when the feature passes its acceptance check. Count bugs as issues found by tests, hooks or manual use after that point. Keep the raw notes below.

## Raw notes
