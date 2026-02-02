# Bootstrap Protocol (MANDATORY)

This repository uses a disk-backed memory system.
Agents are stateless across runs; the files below are the only source of continuity.

Failure to follow this protocol invalidates the work.

---

## Canonical Memory Model (DO NOT DEVIATE)

- `memory.md`  
  Index + current snapshot ONLY. Must remain small and readable.

- `tasks.md`  
  Active, actionable work only. No history.

- `decisions.md`  
  Durable decisions and invariants only. Append-only.

- `memory/archive/memory-log-YYYY-MM.md`  
  Append-only monthly work log (history lives here).

- `scripts/memory_rollup.py`  
  Enforces memory structure and size limits.

---

## Required Preflight (EVERY RUN)

Before doing ANY work:

1. Read:
   - `memory.md`
   - `tasks.md`
   - `decisions.md`

2. Ensure memory system exists:
