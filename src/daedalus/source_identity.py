"""Source identity for printable exports: exact input hashes and a bounded local Git snapshot.

No network call and no shell are used. A source checkout without `.git` reports `unavailable`
rather than inventing a commit, and the YAML rulebook revision stays separate from an official
PDF identity, which is not archived by these exports.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
_GIT_TIMEOUT_S = 2.0


def file_sha256(path: Path) -> str | None:
    """Full SHA-256 of a file, streamed; None when the file is missing or unreadable."""
    try:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b""):
                digest.update(chunk)
        return digest.hexdigest()
    except OSError:
        return None


def _git(*args: str) -> str | None:
    executable = shutil.which("git")
    if executable is None:
        return None
    try:
        result = subprocess.run(
            [executable, "-C", str(REPO_ROOT), *args],
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_S,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip()


@lru_cache(maxsize=1)
def code_snapshot() -> dict[str, object]:
    """Commit and tracked-file dirtiness, cached for the process; bounded and offline."""
    if not (REPO_ROOT / ".git").exists():
        return {"commit": None, "dirty": None, "state": "unavailable"}
    commit = _git("rev-parse", "HEAD")
    status = _git("status", "--porcelain", "--untracked-files=no")
    if commit is None or status is None:
        return {"commit": None, "dirty": None, "state": "unavailable"}
    return {"commit": commit, "dirty": bool(status), "state": "recorded"}


def source_identity(
    *,
    rulebook_path: Path,
    geometry_path: Path,
    rulebook_revision: str | None = None,
    generated: str | None = None,
) -> dict[str, object]:
    """Portable provenance block for the report and scrutineering templates."""
    code = code_snapshot()
    return {
        "generated": generated or datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "rulebook": {
            "file": rulebook_path.name,
            "revision": rulebook_revision,
            "sha256": file_sha256(rulebook_path),
        },
        "geometry": {
            "file": geometry_path.name,
            "sha256": file_sha256(geometry_path),
        },
        "code": {**code, "label": short_commit(code)},
        "official_rule_pdf_archived": False,
    }


def short_commit(snapshot: dict[str, object]) -> str:
    """Readable commit label; dirty and unavailable states are explicit."""
    if snapshot.get("state") != "recorded":
        return "unknown (no .git in this source installation)"
    commit = snapshot.get("commit")
    label = str(commit)[:12] if commit else "unknown"
    return f"{label} (dirty tree)" if snapshot.get("dirty") else f"{label} (clean tree)"


def full_hash(value: object) -> str:
    """Full hex digest or an explicit unavailable marker; never a truncated identity."""
    return str(value) if value else "unavailable (file not readable)"
