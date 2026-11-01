"""Importers for measured race data (spec §5.2a, P1-04).

Pure parsing and validation with no side effects: each function returns validated dataclasses
plus flags, and callers own persistence through the EvidenceStore. The store is append-only,
so an import can never update or delete an existing record.

Units in headers (``time [ms]``, ``mass (g)`` or a ``_ms`` suffix) are parsed with Pint and
converted to SI; unknown or dimension-mismatched units are rejected, never guessed. Outliers
(median ± 5·MAD on the measured times) are flagged but never dropped: every row imports.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from typing import Literal

import numpy as np
import pint
from pydantic import BaseModel, ConfigDict, Field

from daedalus import contracts as c

UREG = pint.UnitRegistry()

OUTLIER_K_MAD = 5.0

TimingsKind = Literal["race_timing", "thrust_curve", "mass_readings"]

# Column-name aliases (after lowercasing); a bracketed or suffixed unit overrides the default.
_ALIASES: dict[str, tuple[str, ...]] = {
    "run_no": ("run_no", "runnumber", "run", "no", "n"),
    "lane": ("lane",),
    "time": ("time", "time_s", "t"),
    "reaction": ("reaction", "reaction_s", "reactiontime", "reaction_time", "rt"),
    "mass": ("mass", "mass_g", "m"),
    "part": ("part", "component", "name"),
    "instrument": ("instrument", "device", "scale"),
    "resolution": ("resolution", "resolution_g", "d"),
    "notes": ("notes", "note", "comment", "comments"),
    "force": ("force", "force_n", "f", "thrust", "thrust_n"),
}
_DEFAULT_UNITS: dict[str, str] = {
    "time": "s",
    "reaction": "s",
    "mass": "g",
    "force": "N",
}
# SI target for every measured column: race times and mass in the race-relevant units.
_TARGET: dict[str, tuple[pint.Unit, str]] = {
    "time": (UREG.parse_units("s"), "s"),
    "reaction": (UREG.parse_units("s"), "s"),
    "mass": (UREG.parse_units("kg"), "kg"),
    "force": (UREG.parse_units("N"), "N"),
}


def _norm(name: str) -> str:
    return re.sub(r"[\s_\-.]", "", name).lower()


_ALTERNATIVES = {k: frozenset(_norm(a) for a in v) for k, v in _ALIASES.items()}
_ALL_ALIASES = frozenset().union(*_ALTERNATIVES.values())

_BRACKET = re.compile(r"[\[(]([^\])]+)[\])]")


class ImportRejectedError(ValueError):
    """Raised for any rejected import file with a human-readable reason."""


def _split_header(raw: str) -> tuple[str, str | None]:
    """`time [ms]`, `time (ms)` and `time_ms` all give ("time", "ms")."""
    m = _BRACKET.search(raw)
    if m:
        return _BRACKET.sub("", raw).strip(), m.group(1).strip()
    head, sep, tail = raw.strip().rpartition("_")
    if sep and head and tail and _norm(raw) not in _ALL_ALIASES:
        try:
            UREG.parse_units(tail)
        except (pint.UndefinedUnitError, ValueError, AttributeError):
            return raw.strip(), None
        return head, tail
    return raw.strip(), None


def _resolve_columns(headers: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for i, raw in enumerate(headers):
        name = _norm(_split_header(raw)[0])
        for key, aliases in _ALTERNATIVES.items():
            if name in aliases or name == key:
                if key in out:
                    raise ImportRejectedError(
                        f"two columns match {key!r}: {headers[out[key]]!r} and {raw!r}"
                    )
                out[key] = i
    return out


def _header_unit(raw: str) -> str | None:
    return _split_header(raw)[1]


def _convert(value: float, unit: str, field: str) -> float:
    """Convert `value` in `unit` to the field's SI target, rejecting unit mismatches."""
    try:
        q = value * UREG.parse_expression(unit)
    except pint.UndefinedUnitError as exc:
        raise ImportRejectedError(f"unknown unit {unit!r} for {field}") from exc
    target, _ = _TARGET[field]
    if q.dimensionality != target.dimensionality:
        raise ImportRejectedError(
            f"unit {unit!r} is not a {field} unit (got dimensionality {q.dimensionality})"
        )
    return float(q.to(target).magnitude)


def _to_float(cell: str, where: str) -> float:
    try:
        v = float(cell)
    except ValueError as exc:
        raise ImportRejectedError(f"{where}: {cell!r} is not a number") from exc
    if not np.isfinite(v):
        raise ImportRejectedError(f"{where}: {cell!r} is not finite")
    return v


def _outliers(times: np.ndarray) -> tuple[int, ...]:
    """Indices beyond median ± 5·MAD; flagged only, never dropped."""
    if times.size < 3:
        return ()
    med = float(np.median(times))
    mad = float(np.median(np.abs(times - med)))
    if mad == 0.0:
        return ()
    return tuple(int(i) for i in np.flatnonzero(np.abs(times - med) > OUTLIER_K_MAD * mad))


def _table(
    data: bytes, filename: str, columns: tuple[str, ...]
) -> tuple[list[str], list[list[str]]]:
    """Rows from CSV (`,`, `;` or tab) or XLSX; always str cells and a header row of names."""
    name = filename.lower()
    if name.endswith(".csv"):
        text = data.decode("utf-8-sig")
        rows = [r for r in text.splitlines() if r.strip() and not r.lstrip().startswith("#")]
        if not rows:
            raise ImportRejectedError("CSV file is empty")
        delim = (
            ";" if rows[0].count(";") > rows[0].count(",") else ("\t" if "\t" in rows[0] else ",")
        )
        parsed = list(csv.reader(io.StringIO("\n".join(rows)), delimiter=delim))
        parsed = [list(r) for r in parsed]
    elif name.endswith((".xlsx", ".xlsm")):
        from openpyxl import load_workbook

        try:
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        except Exception as exc:
            raise ImportRejectedError(f"could not read Excel file: {exc}") from exc
        ws = wb.active
        if ws is None:
            raise ImportRejectedError("Excel file has no sheet")
        parsed = [
            [("" if cell is None else str(cell)) for cell in row]
            for row in ws.iter_rows(values_only=True)
        ]
        wb.close()
    else:
        raise ImportRejectedError(f"unsupported file type {filename!r}; use .csv or .xlsx")

    while parsed and not any(c.strip() for c in parsed[0]):
        parsed.pop(0)
    if not parsed:
        raise ImportRejectedError("no data rows")
    headers = [(c or "").strip() for c in parsed[0]]
    cols = _resolve_columns(headers)
    missing = [field for field in columns if field not in cols]
    if missing:
        found = ", ".join(headers) or "no headers"
        raise ImportRejectedError(f"missing required column(s) {missing}; found: {found}")
    width = len(headers)
    rows = [r + [""] * (width - len(r)) for r in parsed[1:] if any(c.strip() for c in r)]
    if not rows:
        raise ImportRejectedError("no data rows under the header")
    return headers, rows


class TimingRow(BaseModel):
    """One imported race run, SI units."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    run_no: int
    lane: str
    time_s: float = Field(gt=0)
    reaction_s: float | None = None
    mass_kg: float | None = None
    notes: str = ""


@dataclass(frozen=True)
class RaceTimings:
    rows: tuple[TimingRow, ...]
    outlier_indices: tuple[int, ...] = ()
    units: dict[str, str] = field(default_factory=dict)  # declared/assumed units, pre-conversion
    warnings: tuple[str, ...] = ()


def parse_race_timing(data: bytes, filename: str) -> RaceTimings:
    """Parse run_no/lane/time/reaction/mass rows into SI, flagging 5·MAD time outliers."""
    headers, raws = _table(data, filename, columns=("time",))
    cols = _resolve_columns(headers)
    units: dict[str, str] = {}
    for key in ("time", "reaction", "mass"):
        i = cols.get(key)
        if i is None:
            continue
        units[key] = (_header_unit(headers[i]) or _DEFAULT_UNITS[key]).lower()

    times = np.array(
        [
            _convert(_to_float(r[cols["time"]], f"row {k + 2}"), units["time"], "time")
            for k, r in enumerate(raws)
        ]
    )
    rows: list[TimingRow] = []
    run_seen: set[int] = set()
    for k, r in enumerate(raws):
        where = f"row {k + 2}"
        run_raw = r[cols["run_no"]].strip() if "run_no" in cols else str(k + 1)
        run_no = int(_to_float(run_raw, f"{where} (run_no)"))
        if run_no <= 0:
            raise ImportRejectedError(f"{where}: run number must be positive")
        if run_no in run_seen:
            raise ImportRejectedError(f"{where}: duplicate run number {run_no}")
        run_seen.add(run_no)
        time_s = times[k]
        if time_s <= 0:
            raise ImportRejectedError(f"{where}: race time must be positive, got {time_s}")
        reaction_s: float | None = None
        if "reaction" in cols and r[cols["reaction"]].strip():
            reaction_s = _convert(
                _to_float(r[cols["reaction"]], f"{where} (reaction)"), units["reaction"], "reaction"
            )
        mass_kg: float | None = None
        if "mass" in cols and r[cols["mass"]].strip():
            mass_kg = _convert(_to_float(r[cols["mass"]], f"{where} (mass)"), units["mass"], "mass")
        notes = r[cols["notes"]].strip() if "notes" in cols else ""
        lane = r[cols["lane"]].strip() if "lane" in cols else ""
        rows.append(
            TimingRow(
                run_no=run_no,
                lane=lane,
                time_s=time_s,
                reaction_s=reaction_s,
                mass_kg=mass_kg,
                notes=notes,
            )
        )
    outliers = _outliers(times)
    warnings: list[str] = [
        f"row {i + 2} flagged as a time outlier (median ± 5·MAD)" for i in outliers
    ]
    if units["time"] != "s":
        warnings.append(f"time column read in {units['time']}")
    return RaceTimings(
        rows=tuple(rows),
        outlier_indices=outliers,
        units=units,
        warnings=tuple(warnings),
    )


@dataclass(frozen=True)
class MassReading:
    part: str
    value_kg: float
    resolution_kg: float
    instrument: str
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class MassReadings:
    readings: tuple[MassReading, ...]
    units: dict[str, str] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()


def parse_mass_readings(data: bytes, filename: str) -> MassReadings:
    """Repeated scale readings per part; the reading mean carries the instrument resolution."""
    headers, raws = _table(data, filename, columns=("part", "mass"))
    cols = _resolve_columns(headers)
    units = {"mass": (_header_unit(headers[cols["mass"]]) or _DEFAULT_UNITS["mass"]).lower()}
    groups: dict[str, list[float]] = {}
    resolutions: dict[str, float] = {}
    instruments: dict[str, str] = {}
    for k, r in enumerate(raws):
        where = f"row {k + 2}"
        part = r[cols["part"]].strip() or f"part {k + 1}"
        value = _convert(_to_float(r[cols["mass"]], f"{where}"), units["mass"], "mass")
        if value <= 0:
            raise ImportRejectedError(f"{where}: mass must be positive, got {value}")
        groups.setdefault(part, []).append(value)
        if "resolution" in cols and r[cols["resolution"]].strip():
            res = _convert(
                _to_float(r[cols["resolution"]], f"{where} (resolution)"), units["mass"], "mass"
            )
            if res < 0:
                raise ImportRejectedError(f"{where}: resolution must be non-negative")
            resolutions[part] = max(resolutions.get(part, 0.0), res)
        if "instrument" in cols and r[cols["instrument"]].strip():
            prev = instruments.get(part)
            inst = r[cols["instrument"]].strip()
            if prev and prev != inst:
                raise ImportRejectedError(
                    f"{part}: instrument differs between readings ({prev!r}, {inst!r})"
                )
            instruments[part] = inst

    readings: list[MassReading] = []
    for part, values in groups.items():
        resolution = resolutions.get(part, 0.0)
        if len(values) < 2 and resolution == 0.0:
            raise ImportRejectedError(
                f"{part}: single reading with no instrument resolution cannot carry uncertainty"
            )
        spread = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
        reading_warnings = (
            (f"{part}: {len(values)} readings, spread {spread:.2e} kg within resolution",)
            if spread <= resolution and resolution > 0 and len(values) > 1
            else ()
        )
        readings.append(
            MassReading(
                part=part,
                value_kg=float(np.mean(values)),
                resolution_kg=max(resolution, spread),
                instrument=instruments.get(part, "unspecified"),
                warnings=reading_warnings,
            )
        )
    return MassReadings(
        readings=tuple(readings),
        units=units,
        warnings=tuple(w.warnings for w in readings if w.warnings),  # type: ignore[arg-type]
    )


@dataclass(frozen=True)
class ThrustCurveData:
    t_s: tuple[float, ...]
    force_n: tuple[float, ...]
    warnings: tuple[str, ...] = ()


def parse_thrust_curve(data: bytes, filename: str) -> ThrustCurveData:
    """Server-side mirror of the frontend `parseThrustCsv`: two numeric columns, s and N."""
    headers, raws = _table(data, filename, columns=("time", "force"))
    if (units_time := _header_unit(headers[0])) and UREG.parse_expression(units_time).to(
        "s"
    ).magnitude != 1.0:
        raise ImportRejectedError(f"thrust curve time unit must be seconds, got {units_time!r}")
    if (units_force := _header_unit(headers[1])) and UREG.parse_expression(units_force).to(
        "N"
    ).magnitude != 1.0:
        raise ImportRejectedError(f"thrust curve force unit must be newtons, got {units_force!r}")

    t_s: list[float] = []
    force_n: list[float] = []
    for k, r in enumerate(raws):
        where = f"row {k + 2}"
        t_s.append(_to_float(r[0], f"{where} (time)"))
        force_n.append(_to_float(r[1], f"{where} (force)"))
    if len(t_s) < 2:
        raise ImportRejectedError("thrust curve needs at least two samples")
    for i in range(1, len(t_s)):
        if t_s[i] <= t_s[i - 1]:
            raise ImportRejectedError(f"thrust curve time not strictly increasing at row {i + 2}")
    if any(f < 0 for f in force_n):
        raise ImportRejectedError("thrust curve contains negative force values")
    warnings: list[str] = []
    if force_n[-1] > 0:
        warnings.append("force does not end at zero; the model treats the tail as a hard stop")
    return ThrustCurveData(t_s=tuple(t_s), force_n=tuple(force_n), warnings=tuple(warnings))


def to_race_runs(
    timings: RaceTimings,
    *,
    build_id: str,
    split: Literal["calibration", "validation", "exploratory"],
    timing_definition: str = "manual stopwatch (two-point course)",
    conditions: str = "",
) -> list[c.RaceRun]:
    """Build stored RaceRun records; appending twice never touches earlier records."""
    return [
        c.RaceRun(
            build_id=build_id,
            timing_definition=timing_definition,
            measured_time=c.Quantity(
                value=row.time_s,
                unit="s",
                uncertainty=row.reaction_s,
            ),
            conditions=conditions,
            split=split,
            provenance=c.Provenance.MEASURED,
        )
        for row in timings.rows
    ]


def to_mass_observations(readings: MassReadings, *, subject_id: str) -> list[c.Observation]:
    """One Observation per part: mean reading with resolution/spread as uncertainty."""
    return [
        c.Observation(
            subject_id=subject_id,
            quantity="mass",
            value=c.Quantity(
                value=r.value_kg,
                unit="kg",
                uncertainty=(r.resolution_kg if r.resolution_kg > 0 else None),
            ),
            provenance=c.Provenance.MEASURED,
            source=r.instrument,
        )
        for r in readings.readings
    ]
