# Durable Decisions (CANONICAL)

This file records long-lived decisions that affect structure, workflow, or invariants.
Do NOT record transient implementation choices or task-level decisions here.

## Decisions

- 2026-02-02: Disk-backed memory is canonical for this repo.  
  Rationale: agents are stateless across sessions; shared disk memory enforces continuity and correctness.  
  Implication: agents MUST read `bootstrap.md` and `memory.md` before modifying code.

- 2026-02-02: `memory.md` is restricted to index + current snapshot only.  
  Rationale: prevents memory bloat and drift; detailed history belongs in monthly archive logs.  
  Implication: no task lists, no conversations, no changelogs in `memory.md`.

- 2026-02-02: Memory is tiered into four files:  
  - `memory.md` (index + snapshot)  
  - `tasks.md` (active work only)  
  - `decisions.md` (durable decisions)  
  - `memory/archive/*` (append-only logs)  
  Rationale: separation of concerns keeps each file small and authoritative.

- 2026-02-02: CI produces a `.vsix` artifact using `npx vsce package` after tests pass.  
  Rationale: ensures a reproducible extension artifact is always available for validation and release.  
  Reference: `.github/workflows/test.yml`

## Rules
- Append only; never rewrite past decisions.
- If a decision stops being true, add a NEW decision that supersedes it.
- Each decision must include:
  - Date
  - Clear statement
  - Rationale
  - Implication (what it forces or forbids)
