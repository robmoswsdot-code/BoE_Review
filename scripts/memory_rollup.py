#!/usr/bin/env python3
"""
memory_rollup.py

Hybrid B+C memory enforcement:
- memory.md: index + snapshot only (small)
- tasks.md: active tasks only
- decisions.md: durable decisions only
- monthly logs: memory/archive/memory-log-YYYY-MM.md
- rollup: reduces oversized monthly logs

Usage:
  python scripts/memory_rollup.py ensure
  python scripts/memory_rollup.py check
  python scripts/memory_rollup.py append "what changed; why; verification; files"
  python scripts/memory_rollup.py rollup
  python scripts/memory_rollup.py --help
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_DIR = ROOT / "memory" / "archive"

MEMORY_MD = ROOT / "memory.md"
TASKS_MD = ROOT / "tasks.md"
DECISIONS_MD = ROOT / "decisions.md"

# Limits (tune to taste)
MAX_MONTHLY_LOG_LINES = 800     # when exceeded, roll up that month
KEEP_TAIL_LINES = 200          # keep last N lines in the monthly log after rollup

MAX_MEMORY_MD_LINES = 120      # memory.md should remain an index + snapshot
FORBIDDEN_MEMORY_MARKERS = (
    "## Changelog",
    "## Open Tasks",
    "## Known Issues",
    "## Decisions",  # decisions belong in decisions.md
)


def month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def today_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def monthly_log_path(dt: datetime) -> Path:
    return ARCHIVE_DIR / f"memory-log-{month_key(dt)}.md"


def write_if_missing(path: Path, content: str) -> None:
    if not path.exists() or path.read_text(encoding="utf-8").strip() == "":
        path.write_text(content, encoding="utf-8")


def ensure_files(dt: datetime) -> Path:
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    # Monthly log
    log_path = monthly_log_path(dt)
    write_if_missing(log_path, f"# Memory Log — {month_key(dt)}\n\n")

    # memory.md (index + snapshot only)
    write_if_missing(
        MEMORY_MD,
        "# Project Memory (INDEX)\n\n"
        "## Current Snapshot (keep <= 60 lines)\n"
        "- Goal:\n"
        "- Current milestone:\n"
        "- Current focus:\n"
        "- Repo invariants (do-not-break):\n"
        "- Last known good commands:\n"
        "- Environment notes:\n\n"
        "## Canonical References\n"
        "- Active tasks: ./tasks.md\n"
        "- Durable decisions: ./decisions.md\n"
        "- Append-only logs: ./memory/archive/\n\n"
        "## Repo Map (high-signal only)\n"
        "- Entry point:\n"
        "- Core logic:\n\n"
        "## Rollup Policy\n"
        "- Logs go to ./memory/archive/memory-log-YYYY-MM.md\n"
        "- Roll up large monthly logs with: python scripts/memory_rollup.py rollup\n",
    )

    # tasks.md (active queue only)
    write_if_missing(
        TASKS_MD,
        "# Active Tasks (CANONICAL)\n\n"
        "This file contains ONLY current, actionable work.\n\n"
        "## Now (top priority, max 7)\n"
        "- [ ] \n\n"
        "## Next (ready but not started)\n"
        "- [ ] \n\n"
        "## Parked / Blocked\n"
        "- (none)\n\n"
        "## Rules\n"
        "- Keep this list short and current.\n"
        "- No history, no design notes.\n"
        "- When done, remove the task and record outcome in the monthly archive log.\n",
    )

    # decisions.md (durable decisions only)
    write_if_missing(
        DECISIONS_MD,
        "# Durable Decisions (CANONICAL)\n\n"
        "Append-only decisions that affect workflow, invariants, or structure.\n"
        "Do NOT record transient implementation choices here.\n\n"
        "## Decisions\n"
        "- YYYY-MM-DD: Decision. Rationale: ... Implication: ...\n\n"
        "## Rules\n"
        "- Append only; never rewrite past decisions.\n"
        "- If a decision changes, add a NEW decision that supersedes it.\n",
    )

    return log_path


def check_memory_sanity() -> int:
    issues: list[str] = []

    if MEMORY_MD.exists():
        text = MEMORY_MD.read_text(encoding="utf-8")
        lines = text.splitlines()

        if len(lines) > MAX_MEMORY_MD_LINES:
            issues.append(
                f"memory.md is {len(lines)} lines (limit {MAX_MEMORY_MD_LINES}). "
                "It should be index + snapshot only."
            )

        for marker in FORBIDDEN_MEMORY_MARKERS:
            if marker in text:
                issues.append(f"memory.md contains forbidden section marker: {marker}")

    else:
        issues.append("memory.md is missing (run: python scripts/memory_rollup.py ensure)")

    if issues:
        print("[check] FAIL:")
        for i in issues:
            print(f"  - {i}")
        return 1

    print("[check] OK")
    return 0


def append_entry(dt: datetime, text: str) -> None:
    log_path = ensure_files(dt)
    entry = f"## {today_key(dt)}\n- {text.strip()}\n\n"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(entry)


def rollup_month(dt: datetime) -> None:
    log_path = ensure_files(dt)
    lines = log_path.read_text(encoding="utf-8").splitlines()

    if len(lines) <= MAX_MONTHLY_LOG_LINES:
        print(f"[rollup] OK: {log_path.name} has {len(lines)} lines (<= {MAX_MONTHLY_LOG_LINES})")
        return

    # Lightweight summary
    headings = [ln for ln in lines if ln.startswith("## ")]
    bullet_count = sum(1 for ln in lines if ln.strip().startswith("- "))

    header = [
        f"# Memory Log — {month_key(dt)} (ROLLED UP)",
        "",
        "## Summary",
        f"- Days logged: {len(headings)}",
        f"- Bullet items: {bullet_count}",
        "- Notes: Monthly log exceeded size limit and was rolled up.",
        "",
        "## Recent Tail (last entries preserved)",
        "",
    ]

    tail = lines[-KEEP_TAIL_LINES:]
    new_content = "\n".join(header + tail) + "\n"
    log_path.write_text(new_content, encoding="utf-8")
    print(f"[rollup] Rolled up {log_path.name}: {len(lines)} -> {len(new_content.splitlines())} lines")


def print_help() -> None:
    print(__doc__.strip())


def main() -> int:
    dt = datetime.now()
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print_help()
        return 0

    cmd = sys.argv[1].lower()

    if cmd == "ensure":
        p = ensure_files(dt)
        print(f"[ensure] OK: {p.relative_to(ROOT)}")
        return 0

    if cmd == "check":
        ensure_files(dt)
        return check_memory_sanity()

    if cmd == "append":
        if len(sys.argv) < 3:
            print('Usage: append "what changed; why; verification; files"')
            return 2
        append_entry(dt, " ".join(sys.argv[2:]))
        print("[append] OK")
        return 0

    if cmd == "rollup":
        rollup_month(dt)
        return 0

    print(f"Unknown command: {cmd}")
    print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
