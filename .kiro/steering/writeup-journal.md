---
inclusion: manual
---
# Write-up journal: how to log a Kiro moment

When asked to log a journal entry (via `#writeup-journal` or a prompt starting with `journal:`), **append** one entry to `docs/kiro-journal.md`. Never rewrite or reorder earlier entries. Use today's date and this exact format:

```markdown
## YYYY-MM-DD · P<phase> · <short title>
- **Surface:** IDE | CLI | Web | Crew
- **Kiro feature:** spec <name> | steering <file> | hook H<n> | agent <name> | MCP <server>/<tool> | PBT | Power
- **Trigger / ask:** what started it, quoting the prompt or naming the file that fired the hook
- **What Kiro did:** 1–3 sentences, concrete (files touched, tests generated, tool calls made)
- **Outcome (numbers):** e.g. "PBT found off-by-one in resample at jitter > 40%"; "g error 4.1% → 1.8%"; "scaffolded 6 files in 3 min"
- **Human correction:** what you had to fix or reject, if anything (honesty makes the write-up credible)
- **Evidence:** docs/evidence/<file>.png · commit <sha> · test <path>
- **Write-up section:** 1 Overview · 2 Specs · 3 Steering · 4 Hooks · 5 Agents · 6 MCP · 7 PBT · 8 Powers · 9 IDE vs CLI
```

Rules:
- Only log what actually happened in this session. If a number wasn't measured, write "not measured", never an estimate dressed up as a result.
- Keep each entry under 12 lines.
- If the moment fits the demo video, add `🎬` after the title.
- After appending, reply with the entry text so it can be checked.
