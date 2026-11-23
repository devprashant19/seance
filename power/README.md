# Séance Power Bundle

The power bundle collects all Kiro-powered developer tools into one reference.

## MCP Server

The `seance-mcp` server exposes 6 tools over stdio:

| Tool | Purpose |
|------|---------|
| `trace_stats` | Load a .seance trace and compute timing statistics |
| `list_spirits` | List connected spirits in the relay dev room |
| `record_trace` | Record sensor data from a spirit to a .seance file |
| `read_stream` | Pull live sensor samples with decimation |
| `run_experiment` | Run experiment analysis pipeline on a trace |
| `compare_traces` | Diff timing metrics and channel RMS between traces |

### Quick Start

```bash
# Build the server
pnpm -F seance-mcp run build

# Run directly
node packages/seance-mcp/dist/index.js

# Or configure in .kiro/settings/mcp.json (already done)
```

## Custom Agents

Four domain-specific agents in `.kiro/agents/`:

| Agent | Role |
|-------|------|
| **Physicist** | Validates physics experiments, computes expected values, uncertainty analysis |
| **Medium** | Facilitates live séance sessions, guides users through experiments |
| **Necromancer** | Recovers insights from old/damaged traces, infers experiment types |
| **Exorcist** | Debugs system issues: sensor anomalies, relay failures, pipeline errors |

## Developer Hooks

Hooks H1–H8 in `.kiro/hooks/` automate quality gates:

| Hook | Trigger | Action |
|------|---------|--------|
| H1 | Experiment spec saved | Scaffold/sync experiment plugin |
| H2 | Haunting test saved | Generate test stubs |
| H3 | Spirit contract saved | Validate spirit interface |
| H4 | Physics formula saved | Check dimensional analysis |
| H5 | seance-core API changed | Typecheck all downstream packages |
| H6 | Avatar mood changed | Verify documentation references |
| H7 | Fixture trace saved | Validate against GhostTrace schema |
| H8 | React component saved | Lightweight a11y sweep |

## MCP Configuration

See `.kiro/settings/mcp.json` for the server configuration with auto-approve rules.
