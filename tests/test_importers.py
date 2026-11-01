"""Tests for measured-data importers (T09): unit conversion, outliers, thrust rules."""

from __future__ import annotations

import io
from pathlib import Path

import pytest

from daedalus.importers import (
    ImportRejectedError,
    parse_mass_readings,
    parse_race_timing,
    parse_thrust_curve,
    to_mass_observations,
    to_race_runs,
)


def csv(text: str) -> bytes:
    return text.encode()


class TestUnitParsing:
    def test_millisecond_header_is_converted_to_seconds(self) -> None:
        data = csv("run_no,lane,time [ms]\n1,a,1200\n2,b,1250\n3,a,1230\n")
        parsed = parse_race_timing(data, "runs.csv")
        assert parsed.units["time"] == "ms"
        assert parsed.rows[0].time_s == 1.2

    def test_millisecond_suffix_header_is_converted(self) -> None:
        data = csv("run_no,time_ms,notes\n1,1200,ok\n2,1250,\n3,1230,\n")
        parsed = parse_race_timing(data, "runs.csv")
        assert parsed.rows[0].time_s == 1.2

    def test_mass_grams_become_kilograms(self) -> None:
        data = csv("run_no,time [s],mass [g],notes\n1,10,55,\n2,11,55.5,\n3,12,54.5,\n")
        parsed = parse_race_timing(data, "runs.csv")
        assert parsed.units["mass"] == "g"
        assert parsed.rows[0].mass_kg == pytest.approx(0.055)

    def test_dimension_mismatch_is_rejected(self) -> None:
        data = csv("run_no,time [kg]\n1,10\n2,11\n3,12\n")
        with pytest.raises(ImportRejectedError, match="not a time unit"):
            parse_race_timing(data, "runs.csv")

    def test_unknown_unit_is_rejected(self) -> None:
        data = csv("run_no,time [blorps]\n1,10\n2,11\n3,12\n")
        with pytest.raises(ImportRejectedError, match="unknown unit"):
            parse_race_timing(data, "runs.csv")


class TestValidation:
    def test_zero_and_negative_times_are_rejected(self) -> None:
        with pytest.raises(ImportRejectedError, match="must be positive"):
            parse_race_timing(csv("run_no,time_s\n1,0\n2,10\n3,11\n"), "runs.csv")
        with pytest.raises(ImportRejectedError, match="must be positive"):
            parse_race_timing(csv("run_no,time_s\n1,-5\n2,10\n3,11\n"), "runs.csv")

    def test_duplicate_run_numbers_are_rejected(self) -> None:
        with pytest.raises(ImportRejectedError, match="duplicate run number 1"):
            parse_race_timing(csv("run_no,time_s\n1,10\n1,11\n2,12\n"), "runs.csv")

    def test_xlsx_is_supported(self) -> None:
        openpyxl = pytest.importorskip("openpyxl")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["run_no", "lane", "time [ms]"])
        ws.append([1, "a", 1200])
        ws.append([2, "b", 1250])
        ws.append([3, "a", 1230])
        buf = io.BytesIO()
        wb.save(buf)
        parsed = parse_race_timing(buf.getvalue(), "runs.xlsx")
        assert parsed.rows[0].time_s == pytest.approx(1.2)


class TestOutliers:
    def test_a_five_mad_row_is_flagged_but_kept(self) -> None:
        # med=1.25 s, MAD=0.05: 5·MAD=0.25, so 3.0 s is an outlier and stays in the rows.
        data = csv("run_no,time_s\n1,1.2\n2,1.25\n3,1.3\n4,3.0\n")
        parsed = parse_race_timing(data, "runs.csv")
        assert parsed.outlier_indices == (3,)
        assert len(parsed.rows) == 4
        assert "row 5 flagged" in parsed.warnings[0]

    def test_a_four_mad_row_is_not_flagged(self) -> None:
        data = csv("run_no,time_s\n1,1.2\n2,1.25\n3,1.3\n4,1.5\n")
        parsed = parse_race_timing(data, "runs.csv")
        assert parsed.outlier_indices == ()


class TestThrustCurve:
    def test_mirrors_frontend_rejection_rules(self) -> None:
        good = "t_s,force_n\n0,0\n0.1,5\n0.2,3\n"
        parsed = parse_thrust_curve(good.encode(), "curve.csv")
        assert parsed.t_s == (0.0, 0.1, 0.2)
        assert parsed.force_n == (0.0, 5.0, 3.0)
        for bad in (
            "t [ms],f [N]\n0,0\n100,5",  # milliseconds
            "t [s],f [kN]\n0,0\n1,5",  # kilonewtons
            "t_s,force_n\n0,0\n0.2,5\n0.1,3",  # not increasing
            "t_s,force_n\n0,0\n0.1,-1\n0.2,3",  # negative force
        ):
            with pytest.raises(ImportRejectedError):
                parse_thrust_curve(bad.encode(), "curve.csv")


class TestMassReadings:
    def test_repeated_readings_carry_resolution_as_uncertainty(self) -> None:
        data = csv(
            "part,mass [g],resolution [g],instrument\n"
            "body,55.0,0.1,scale A\nbody,55.2,0.1,scale A\nwheels,10,0.1,scale B\n"
        )
        parsed = parse_mass_readings(data, "mass.csv")
        by_part = {r.part: r for r in parsed.readings}
        assert by_part["body"].value_kg == pytest.approx(0.0551)
        assert by_part["body"].resolution_kg == pytest.approx(
            1.4142e-4, rel=1e-3
        )  # std > resolution
        assert by_part["wheels"].resolution_kg == pytest.approx(1e-4)
        assert by_part["body"].instrument == "scale A"

    def test_conflicting_instruments_are_rejected(self) -> None:
        data = csv("part,mass [g],instrument\nbody,55,scale A\nbody,55.2,scale B\n")
        with pytest.raises(ImportRejectedError, match="instrument differs"):
            parse_mass_readings(data, "mass.csv")


def test_to_race_runs_appends_without_mutation(tmp_path: Path) -> None:
    """Two imports of the same file append two record sets; earlier records are untouched."""
    from daedalus import contracts as c
    from daedalus.store import EvidenceStore

    store = EvidenceStore(tmp_path)
    try:
        build = store.add(
            c.PhysicalBuild(
                design_id=_design(store), build_batch="A1", manufacturing_route="3dprint"
            )
        )
        timings = parse_race_timing(csv("run_no,time_s\n1,1.20\n2,1.25\n3,1.30\n"), "runs.csv")
        first = to_race_runs(timings, build_id=build.build_id, split="calibration")
        for run in first:
            store.add(run)
        snapshots = [store.get(r.race_run_id, c.RaceRun) for r in first]

        parsed_mass = parse_mass_readings(
            csv("part,mass [g],instrument\nbody,55,0.1,scale\nbody,55.2,0.1,scale\n"),
            "mass.csv",
        )
        obs = to_mass_observations(parsed_mass, subject_id=build.build_id)
        assert obs[0].value.unit == "kg"

        # A second import appends new records with new ids; originals stay byte-identical.
        second = to_race_runs(timings, build_id=build.build_id, split="calibration")
        for run in second:
            store.add(run)
        assert {r.race_run_id for r in second}.isdisjoint({r.race_run_id for r in first})
        assert all(
            store.get(r.race_run_id, c.RaceRun).model_dump() == s.model_dump()
            for r, s in zip(first, snapshots, strict=True)
        )
    finally:
        store.close()


def _design(store: object) -> str:
    from daedalus import contracts as c
    from daedalus.store import EvidenceStore, sha256_of

    assert isinstance(store, EvidenceStore)
    project = store.add(c.Project(team="Veloira", competition_class="reference"))
    return store.add(
        c.Design(
            project_id=project.project_id,
            geometry_hash=sha256_of(b"geom"),
            cad_source="build123d",
            parameters=(),
            provenance=c.Provenance.SYNTHETIC,
        )
    ).design_id
