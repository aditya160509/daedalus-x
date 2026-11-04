import json
from pathlib import Path

from daedalus.api.compute import summarise


def test_summarise_reads_cells_iterations_and_wall_time(tmp_path: Path) -> None:
    run = tmp_path / "run_a"
    run.mkdir()
    (run / "log.checkMesh").write_text("  cells:            12345\n")
    (run / "log.simpleFoam").write_text(
        "Time = 1\nExecutionTime = 1.0 s  ClockTime = 2 s\n"
        "Time = 2\nExecutionTime = 9.5 s  ClockTime = 11 s\n"
    )
    (run / "daedalus_result.json").write_text(
        json.dumps({"succeeded": True, "acceptance": "accepted"})
    )
    row = summarise(run)
    assert row.status == "succeeded"
    assert row.acceptance == "accepted"
    assert row.cells == 12345
    assert row.iterations == 2
    assert row.solver_cpu_s == 9.5
    assert row.solver_wall_s == 11.0


def test_summarise_without_result_is_unknown_or_running(tmp_path: Path) -> None:
    run = tmp_path / "run_b"
    run.mkdir()
    assert summarise(run).status == "unknown"
    (run / "log.simpleFoam").write_text("Time = 1\n")
    assert summarise(run).status == "running"
