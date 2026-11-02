"""Energy-loss audit (T19). The car and thrust curve are synthetic, chosen to exercise the maths."""

from __future__ import annotations

import dataclasses

import numpy as np
import pytest

from daedalus.dynamics import CarParams, ModelLevel, ThrustCurve, simulate
from daedalus.energy import EnergyAuditError, audit, audit_car, compare

THRUST = ThrustCurve(
    np.array([0.0, 0.02, 0.1, 0.4, 0.6]), np.array([0.0, 4.0, 3.0, 1.5, 0.0])
)  # synthetic
CAR = CarParams(0.05, 20.0, thrust=THRUST, cda_m2=4.0e-4, crr=0.01)


def test_energy_books_balance() -> None:
    a = audit_car(CAR)
    assert a.thrust_work_j > 0
    assert a.closure_fraction < 0.01
    assert a.kinetic_energy_j + a.total_loss_j == pytest.approx(a.thrust_work_j, rel=0.01)


def test_kinetic_energy_matches_the_finish_speed() -> None:
    res = simulate(CAR, ModelLevel.M2)
    a = audit(res, CAR.mass_kg)
    assert a.kinetic_energy_j == pytest.approx(0.5 * CAR.mass_kg * float(res.v[-1]) ** 2)


def test_conversion_efficiency_and_losses_add_to_one() -> None:
    a = audit_car(CAR)
    share = a.conversion_efficiency + a.total_loss_j / a.thrust_work_j
    assert share == pytest.approx(1.0, abs=0.01)
    assert a.drag_loss_j > 0 and a.rolling_loss_j > 0


def test_a_draggier_car_loses_more_to_drag_and_finishes_with_less_energy() -> None:
    base = audit_car(CAR)
    draggy = audit_car(dataclasses.replace(CAR, cda_m2=CAR.cda_m2 * 2))
    change = compare(base, draggy)
    assert change["drag_loss_j"] > 0
    assert change["kinetic_energy_j"] < 0


def test_no_drag_and_no_rolling_means_no_losses() -> None:
    a = audit_car(dataclasses.replace(CAR, cda_m2=0.0, crr=0.0))
    assert a.drag_loss_j == pytest.approx(0.0, abs=1e-12)
    assert a.rolling_loss_j == pytest.approx(0.0, abs=1e-12)
    assert a.conversion_efficiency == pytest.approx(1.0, abs=0.01)


def test_the_car_sheds_energy_while_coasting_after_thrust_ends() -> None:
    a = audit_car(CAR)
    assert a.thrust_end_s == pytest.approx(0.6, abs=0.01)
    assert a.kinetic_energy_at_thrust_end_j >= a.kinetic_energy_j
    assert a.coast_phase_loss_j <= a.total_loss_j + 1e-9


def test_flows_and_mapping_are_exportable() -> None:
    a = audit_car(CAR)
    assert a.dominant_loss() in {"drag", "rolling"}
    assert sum(f["value_j"] for f in a.flows()) == pytest.approx(a.thrust_work_j, rel=0.01)  # type: ignore[misc]
    mapping = a.to_mapping()
    assert mapping["closure_fraction"] == a.closure_fraction


def test_audit_rejects_unusable_results() -> None:
    with pytest.raises(EnergyAuditError):
        audit(simulate(CarParams(0.05, 20.0, constant_accel_m_s2=40.0), ModelLevel.M0), 0.05)
    with pytest.raises(EnergyAuditError):
        audit(simulate(CAR, ModelLevel.M2), 0.0)
    weak = dataclasses.replace(CAR, thrust=ThrustCurve.constant(0.05, 0.1))
    with pytest.raises(EnergyAuditError):
        audit(simulate(weak, ModelLevel.M2), weak.mass_kg)
