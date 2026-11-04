import shutil
import subprocess
from pathlib import Path

from daedalus import ailog

GIT = shutil.which("git") or "git"


def _commit(repo: Path, name: str, msg: str) -> None:
    (repo / name).write_text(name)
    subprocess.run([GIT, "add", name], cwd=repo, check=True)
    subprocess.run([GIT, "commit", "-qm", msg], cwd=repo, check=True)


def test_only_ai_trailer_commits_are_logged(tmp_path: Path) -> None:
    subprocess.run([GIT, "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run([GIT, "config", "user.email", "t@t"], cwd=tmp_path, check=True)
    subprocess.run([GIT, "config", "user.name", "T"], cwd=tmp_path, check=True)
    _commit(tmp_path, "a.py", "Human change")
    _commit(
        tmp_path,
        "b.test.ts",
        "AI change\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
    )
    rows = ailog.entries(tmp_path)
    assert [r["change"] for r in rows] == ["AI change"]
    assert rows[0]["tests_in_commit"] == 1
    assert ailog.to_csv(rows).splitlines()[0].endswith("team_review_note")
