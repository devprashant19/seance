# Implementation Plan — seance-mcp

- [x] 1. Package skeleton and server lifecycle
  - [x] Create `packages/seance-mcp` (package.json with `bin: { "seance-mcp": "dist/index.js" }`, tsconfig, build to `dist/`)
  - [x] Add `@modelcontextprotocol/sdk` (check the current server API via Context7 first) and the stdio transport
  - [x] Implement `config.ts` (flags + env), `log.ts` (stderr only), `format.ts` (quantity + error envelope)
  - _Requirements: 1.1, 1.2, 1.5, 8.4_

- [x] 1.1 Server smoke test
  - [x] Spawn `dist/index.js`, send initialize + tools/list, assert clean stdout and the registered tool names
  - _Requirements: 1.1, 1.2_

- [x] 2. Fixture store
  - [x] `resolve`, `list`, `load` (with v1 validation from seance-core), `writeAtomic`
  - [x] Reject `..`, absolute paths and symlink escapes
  - _Requirements: 3.4, 3.5, 4.2, 8.1_

- [x]* 2.1 Property test: any generated path containing `..` or an absolute root is rejected
  - _Requirements: 8.1_

- [x] 3. trace_stats tool
  - [x] Single-trace and list modes; reuse seance-core health + thresholds
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [x]* 3.1 Property test: trace_stats ≡ computeHealth; uniform timestamps → jitter 0
  - _Requirements: 3.2_

- [x] 4. Observer and offline/live modes
  - [x] `observer.ts`: join room as `observer`, reconnect every 10 s, no control messages
  - [x] `buffers.ts`: ring buffer per spirit × channel (60 s)
  - [x] Relay change if needed: fan out samples to observers; hide observers from the roster
  - _Requirements: 1.3, 1.4, 1.6, 2.4_

- [x]* 4.1 Property test: mode is live ⇔ relay socket open, for random connect/disconnect sequences
  - _Requirements: 1.3, 1.4_

- [x] 5. list_spirits tool
  - [x] Live roster with channels + HealthReport; offline response with hint
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. record_trace tool
  - [x] Collect (future/buffer), build v1 trace, encode → decode round-trip check, atomic write, optional analysis, `nextStep`
  - [x] Enforce max duration; offline error
  - _Requirements: 4.1–4.8_

- [x]* 6.1 Property test: record → decode lossless for random buffers
  - _Requirements: 4.3_

- [ ] 7. Enable in Kiro
  - [ ] Set `seance.disabled = false` in `.kiro/settings/mcp.json`; autoApprove read-only tools
  - [ ] Verify the MCP panel shows the tools; verify hook H2 fires after a `record_trace` call
  - _Requirements: 1.1, 4.8_

- [x]* 8. read_stream tool
  - [x] Summary stats + min-max decimation, `waitForFresh`, spectrum peaks
  - _Requirements: 5.1–5.5_

- [x]* 8.1 Property test: decimation preserves the global min/max per axis
  - _Requirements: 5.2_

- [x]* 9. run_experiment tool
  - [x] Registry lookup, inputs merge, `vsExpected`, `pipeline`, `skipResample`
  - _Requirements: 6.1–6.5_

- [x]* 9.1 Property test: synthetic pendulum traces recover g within reported uncertainty
  - _Requirements: 6.1_

- [x]* 10. compare_traces tool
  - [x] Timing diff, common-grid RMS difference, dominant frequency, result delta, rule-based likelyCauses
  - _Requirements: 7.1–7.4_

- [x]* 10.1 Property test: compare_traces(a, a) is all zeros
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 11. Security checks
  - [ ] Unknown-property rejection test for every tool; no raw audio in any output
  - _Requirements: 8.2, 8.3_

- [ ] 12. Docs and Power wiring
  - [ ] Copy the tool reference to `docs/seance-mcp.md`; make `power/mcp.json` start the published or packaged server with `--offline`
  - _Requirements: 1.5_
