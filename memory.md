# Project Memory (INDEX)

## Current Snapshot (keep <= 60 lines)
- Goal: Process a single `.xlsm` workbook using `SupportDocuments/` to produce a BOE / estimate audit via `mytoolbox.buildEstimate`.
- Current milestone: Memory system bootstrapped (files + rollup script present).
- Current focus: Stabilize test runner and CI using tasks.md; no further bootstrap changes.
- Repo invariants (do-not-break):
  - Row 8 is the canonical header row in workbooks.
  - `SupportDocuments/` must contain required reports (StandardItemReport, NonStandardItemReport).
  - `memory.md` is index + snapshot only; no full logs or conversations.
- Last known good commands:
  - `npm run compile`
  - `npm run watch`
  - `npm run vscode-test`
  - `npx vsce package`
- Environment notes: VS Code extension project; CI builds `.vsix` artifact.

## Canonical References
- Active tasks: `./tasks.md`
- Durable decisions: `./decisions.md`
- Append-only logs (monthly): `./memory/archive/`

## Repo Map (high-signal only)
- Extension entry point: `src/extension.ts`
  - Command: `mytoolbox.buildEstimate`
- Core processing logic: `src/dataProcessor.ts`

## Bootstrap & Memory Invariants
- Bootstrap runs may ONLY initialize memory files and scripts.
- Bootstrap runs MUST NOT modify product behavior, CI, or tests.
- All agents MUST read this file before modifying code.
- All work outcomes MUST be recorded in the monthly archive log, not here.

## Rollup Policy (enforced by script)
- Progress logs are written to `./memory/archive/memory-log-YYYY-MM.md`
- If a monthly log exceeds limits, run:
  - `python scripts/memory_rollup.py rollup`

---

## Memory Pointer
For detailed history, see:
- `memory/archive/memory-log-2026-02.md`
