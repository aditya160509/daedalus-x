"""AI Assistance and Verification Log (STEM Racing C2.18.3) built from the git history.

Every commit whose message carries an AI ``Co-Authored-By`` trailer is one row: when, what
changed, which assistant, and how it was verified (tests touched, CI). The team adds its own
review note before attaching the log to the portfolio.
"""

from __future__ import annotations

import csv
import io
import re
import shutil
import subprocess
from pathlib import Path

AI_TRAILER = re.compile(r"^Co-Authored-By:\s*(.+?)\s*<", re.I | re.M)
AI_NAMES = re.compile(r"claude|codex|gpt|copilot|gemini|haiku|sonnet|opus", re.I)
SEP = "\x1e"


def entries(repo: Path) -> list[dict[str, object]]:
    fmt = f"\x1d%H{SEP}%aI{SEP}%an{SEP}%s{SEP}%B{SEP}"
    out = subprocess.run(
        [shutil.which("git") or "git", "log", f"--format={fmt}", "--numstat"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    rows: list[dict[str, object]] = []
    for chunk in out.split("\x1d"):
        parts = chunk.strip("\n").split(SEP)
        if len(parts) < 6:
            continue
        sha, date, author, subject, body, stat = parts[:6]
        tools = [t for t in AI_TRAILER.findall(body) if AI_NAMES.search(t)]
        if not tools:
            continue
        files = [ln.split("\t")[-1] for ln in stat.strip().splitlines() if "\t" in ln]
        tests = [f for f in files if re.search(r"(^tests/|\.test\.tsx?$)", f)]
        rows.append(
            {
                "commit": sha[:10],
                "date": date,
                "committer": author,
                "assistant": ", ".join(sorted(set(tools))),
                "change": subject,
                "files_changed": len(files),
                "tests_in_commit": len(tests),
                "verification": (
                    f"Automated tests changed/added ({len(tests)}); CI on push; team review"
                    if tests
                    else "CI on push; team review"
                ),
            }
        )
    return rows


def to_csv(rows: list[dict[str, object]]) -> str:
    buf = io.StringIO()
    fields = [*(rows[0].keys() if rows else ["commit"]), "team_review_note"]
    w = csv.DictWriter(buf, fieldnames=fields)
    w.writeheader()
    for r in rows:
        w.writerow({**r, "team_review_note": ""})
    return buf.getvalue()
