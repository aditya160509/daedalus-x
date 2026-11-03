"""One downloadable judge pack (T13): existing exports plus an honest missing list.

The pack reuses what the app already generates instead of duplicating it: the Typst engineering
report, FORGE rule findings, stored run manifests, the design's ORACLE manifest
and the evidence store's own hash verification and coverage report. Anything that cannot be
produced is named in `MISSING.txt` with the reason it failed; a missing artefact is never
replaced by a placeholder or an invented result.
"""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from daedalus import coverage, dossier
from daedalus.store import EvidenceStore


@dataclass
class Pack:
    data: bytes
    manifest: dict[str, Any]
    missing: list[str] = field(default_factory=list)


def _sha(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def _add(bundle: zipfile.ZipFile, name: str, data: bytes, files: list[dict[str, object]]) -> None:
    bundle.writestr(name, data)
    files.append({"path": name, "bytes": len(data), "sha256": _sha(data)})


def _report_bytes(design: str) -> bytes:  # pragma: no cover - exercised through the endpoint
    from daedalus.api import report

    return bytes(report.report_pdf(design=design).body)


def _rules(design: str, rulebook: str) -> dict[str, Any]:  # pragma: no cover
    from daedalus.api import forge

    return dict(forge.checks(design, rulebook))


def _evidence_summary(root: Path) -> tuple[dict[str, Any], list[dict[str, object]]]:
    """Hash verification, record counts and coverage, read from the store itself."""
    store = EvidenceStore(root)
    try:
        broken = store.verify_all()
        timeline = store.timeline(limit=100_000)
        kinds = Counter(kind for _id, kind, _at, _body in timeline)
        actions = coverage.missing_actions(store)
        summary = {
            "ok": not broken,
            "broken": broken,
            "records": len(timeline),
            "by_kind": dict(sorted(kinds.items())),
            "open_actions": coverage.counts(actions),
        }
        gaps = [action.to_mapping() for action in actions]
        return summary, gaps
    finally:
        store.close()


def _design_names(root: Path) -> list[str]:
    designs = root / "designs"
    if not designs.is_dir():
        return []
    return sorted(path.parent.name for path in designs.glob("*/geometry.json"))


def _run_manifests(root: Path) -> Iterable[tuple[str, bytes]]:
    runs = root / "runs"
    if not runs.is_dir():
        return
    for path in sorted(runs.glob("*/daedalus_manifest.json")):
        yield path.parent.name, path.read_bytes()


def build_pack(
    root: Path,
    *,
    design: str,
    team: str,
    rulebook: str = "india-nf-2025-26",
) -> Pack:
    """Compile the pack. Never raises for a missing export; records it instead."""
    generated = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    files: list[dict[str, object]] = []
    missing: list[str] = []
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        try:
            _add(bundle, "report.pdf", _report_bytes(design), files)
        except Exception as exc:  # the report is optional, but the failure must be visible
            missing.append(f"report.pdf — engineering report unavailable: {exc}")

        try:
            rules = _rules(design, rulebook)
            _add(
                bundle,
                f"rules/{design}-checks.json",
                json.dumps(rules, indent=2, default=str).encode(),
                files,
            )
            if rules.get("is_reference_only"):
                missing.append(
                    "rules — the loaded rulebook is a reference copy, not the official revision"
                )
        except Exception as exc:
            missing.append(f"rules/{design}-checks.json — rule checks unavailable: {exc}")

        names = _design_names(root)
        if not names:
            missing.append("designs — no imported design is present")
        for name in names:
            oracle = root / "designs" / name / "oracle.json"
            if oracle.is_file():
                _add(bundle, f"designs/{name}-oracle.json", oracle.read_bytes(), files)

        run_count = 0
        for run_id, manifest_bytes in _run_manifests(root):
            _add(bundle, f"runs/{run_id}-manifest.json", manifest_bytes, files)
            result = root / "runs" / run_id / "daedalus_result.json"
            if result.is_file():
                _add(bundle, f"runs/{run_id}-result.json", result.read_bytes(), files)
            run_count += 1
        if run_count == 0:
            missing.append("runs — no solver run manifest is stored")

        summary, gaps = _evidence_summary(root)
        _add(bundle, "evidence/verification.json", _json(summary), files)
        _add(bundle, "evidence/coverage.json", _json({"items": gaps}), files)

        verification: dict[str, Any] | None = None
        try:
            verification = dossier.build(root)
            _add(bundle, "evidence/dossier.json", _json(verification), files)
            _add(
                bundle,
                "evidence/dossier.md",
                dossier.to_markdown(verification).encode(),
                files,
            )
            counts = verification["summary"]
            if counts["failures"]:
                missing.append(
                    f"verification — {counts['failures']} recorded failure(s); "
                    "see evidence/dossier.md"
                )
            if counts["verified"] < counts["requirements"]:
                missing.append(
                    f"verification — {counts['requirements'] - counts['verified']} of "
                    f"{counts['requirements']} requirement(s) are not verified; "
                    "see evidence/dossier.md"
                )
        except Exception as exc:
            missing.append(f"verification — V&V dossier unavailable: {exc}")
        if summary["broken"]:
            missing.append(
                f"evidence — {len(summary['broken'])} record(s) fail their stored hash check: "
                + ", ".join(summary["broken"][:10])
            )
        if summary["records"] == 0:
            missing.append("evidence — the store has no records")
        if gaps:
            missing.append(
                f"evidence — {len(gaps)} missing action(s) remain; see evidence/coverage.json"
            )

        _add(bundle, "MISSING.txt", _missing_text(missing, generated).encode(), files)
        _add(
            bundle,
            "README.txt",
            _readme_text(design=design, team=team, rulebook=rulebook).encode(),
            files,
        )
        manifest: dict[str, Any] = {
            "generated": generated,
            "design": design,
            "team": team,
            "rulebook": rulebook,
            "files": files,
            "missing": missing,
            "evidence": summary,
            "verification": verification["summary"] if verification else None,
        }
        # The manifest inventories the other entries; hashing itself would be circular.
        bundle.writestr("manifest.json", _json(manifest))

    return Pack(data=buffer.getvalue(), manifest=manifest, missing=missing)


def _json(payload: object) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True, default=str).encode()


def _readme_text(*, design: str, team: str, rulebook: str) -> str:
    return (
        "Daedalus X judge pack\n"
        "=====================\n\n"
        f"Design: {design}\nTeam: {team}\nRulebook: {rulebook}\n\n"
        "Contents\n"
        "--------\n"
        "- report.pdf: the app's existing Typst engineering report.\n"
        "- rules/<design>-checks.json: FORGE rule findings, including CAD-only verdicts.\n"
        "- designs/*-oracle.json: stored ORACLE candidate manifests.\n"
        "- runs/*-manifest.json and *-result.json: stored solver case metadata.\n"
        "- evidence/verification.json: the evidence store's own hash verification and counts.\n"
        "- evidence/coverage.json: next actions derived from the stored records.\n"
        "- evidence/dossier.json and dossier.md: the V&V dossier, built only from stored records,\n"
        "  with failures, limitations and the validation still outstanding.\n"
        "- MISSING.txt: anything that could not be produced, with the reason.\n\n"
        "The evidence hashes cover the stored files, not the physical car. A CAD-only rule result "
        "is not a measurement, a solver run is not an accepted CFD result, and a listed gap means "
        "the app has no record of that step yet.\n"
    )


def _missing_text(missing: list[str], generated: str) -> str:
    if not missing:
        return f"No missing material was detected when this pack was built ({generated}).\n"
    lines = [f"Missing or unverified material ({generated}):", ""]
    lines.extend(f"- {item}" for item in missing)
    return "\n".join(lines) + "\n"
