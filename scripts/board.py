"""Build docs/build/BOARD.md (easy / mid / hard / needs-data checklist) from PLAN.md.

Tag each PLAN item with `easy`, `mid`, `hard` or `data` in backticks at the end of the line.
Tick it in PLAN.md and the board follows; the pre-commit hook regenerates it.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "docs/build/PLAN.md"
BOARD = ROOT / "docs/build/BOARD.md"
GROUPS = {
    "easy": "Easy (10-30 min each)",
    "mid": "Medium (1-2 h each)",
    "hard": "Hard (3-8 h each)",
    "data": "Needs CFD runs or real measurements",
}
ITEM = re.compile(r"^- \[([ x])\] (?:\S+ )?(.*?)\s*`(easy|mid|hard|data)`\s*$")


def main() -> None:
    lines = PLAN.read_text().splitlines()
    done = sum(line.startswith("- [x]") for line in lines)
    total = done + sum(line.startswith("- [ ]") for line in lines)
    section, rows = "", {k: [] for k in GROUPS}
    for line in lines:
        if line.startswith("### ") or line.startswith("## "):
            section = line.lstrip("# ").strip()
        m = ITEM.match(line)
        if m:
            rows[m[3]].append((m[1] == "x", m[2], section))
    out = [
        "# BOARD: what is left, by difficulty",
        "",
        "Generated from `PLAN.md` by `scripts/board.py` on every commit. Do not edit by hand:",
        "tick the item in PLAN.md instead.",
        "",
        f"**Whole plan: {done}/{total} done ({done / total:.0%}).**",
        "",
        "| Group | Done | Open |",
        "|---|---|---|",
    ]
    for key, title in GROUPS.items():
        d = sum(t for t, _, _ in rows[key])
        out.append(f"| {title} | {d} | {len(rows[key]) - d} |")
    for key, title in GROUPS.items():
        out += ["", f"## {title}", ""]
        for ticked, text, sec in sorted(rows[key], key=lambda r: r[0]):
            out.append(f"- [{'x' if ticked else ' '}] {text} _({sec})_")
    BOARD.write_text("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
