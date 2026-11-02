"""Energy-loss audit (T19): where every joule of thrust went during a simulated race.

TITAN resolves thrust, drag and rolling force at every output time, so integrating force times
velocity gives the work done by each. Thrust work must equal the kinetic energy at the finish plus
the work lost to drag and rolling, so the audit also reports how well the books balance, which
doubles as a check on the integrator. It answers "what should we work on?" in joules.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from daedalus.dynamics import CarParams, ModelLevel, RaceResult, simulate

FloatArray = NDArray[np.float64]
LOSS_NAMES = ("drag", "rolling")


class EnergyAuditError(ValueError):
    """Raised when a race result cannot be audited."""


@dataclass(frozen=True)
class EnergyAudit:
    """Energy account for one simulated race, in joules."""

    thrust_work_j: float
    drag_loss_j: float
    rolling_loss_j: float
    kinetic_energy_j: float
    thrust_end_s: float
    kinetic_energy_at_thrust_end_j: float
    closure_error_j: float

    @property
    def total_loss_j(self) -> float:
        return self.drag_loss_j + self.rolling_loss_j

    @property
    def closure_fraction(self) -> float:
        """Unexplained energy as a share of the thrust work (integration error)."""
        return 0.0 if self.thrust_work_j <= 0 else abs(self.closure_error_j) / self.thrust_work_j

    @property
    def conversion_efficiency(self) -> float:
        """Share of thrust work that is still kinetic energy at the finish line."""
        return 0.0 if self.thrust_work_j <= 0 else self.kinetic_energy_j / self.thrust_work_j

    @property
    def coast_phase_loss_j(self) -> float:
        """Kinetic energy shed between the end of thrust and the finish line."""
        return self.kinetic_energy_at_thrust_end_j - self.kinetic_energy_j

    def losses(self) -> dict[str, float]:
        return {"drag": self.drag_loss_j, "rolling": self.rolling_loss_j}

    def dominant_loss(self) -> str:
        losses = self.losses()
        return max(losses, key=lambda name: losses[name])

    def flows(self) -> tuple[dict[str, object], ...]:
        """Source-to-sink flows in joules, ready for a Sankey diagram."""
        flows: list[dict[str, object]] = [
            {"source": "thrust", "target": "kinetic_energy", "value_j": self.kinetic_energy_j}
        ]
        flows.extend(
            {"source": "thrust", "target": name, "value_j": value}
            for name, value in self.losses().items()
        )
        return tuple(flows)

    def to_mapping(self) -> dict[str, object]:
        return {
            "thrust_work_j": self.thrust_work_j,
            "kinetic_energy_j": self.kinetic_energy_j,
            "losses_j": self.losses(),
            "total_loss_j": self.total_loss_j,
            "conversion_efficiency": self.conversion_efficiency,
            "dominant_loss": self.dominant_loss(),
            "thrust_end_s": self.thrust_end_s,
            "kinetic_energy_at_thrust_end_j": self.kinetic_energy_at_thrust_end_j,
            "coast_phase_loss_j": self.coast_phase_loss_j,
            "closure_error_j": self.closure_error_j,
            "closure_fraction": self.closure_fraction,
            "flows": [dict(f) for f in self.flows()],
        }


def _work(force_n: FloatArray, velocity: FloatArray, time_s: FloatArray) -> float:
    return float(np.trapezoid(force_n * velocity, time_s))


def audit(result: RaceResult, mass_kg: float) -> EnergyAudit:
    """Energy account for a finished M1 or M2 race result."""
    if mass_kg <= 0:
        raise EnergyAuditError("mass_kg must be positive")
    if result.model is ModelLevel.M0 or not result.force_terms:
        raise EnergyAuditError("an energy audit needs force terms (model M1 or M2)")
    if not result.finished or result.t.size < 2:
        raise EnergyAuditError("an energy audit needs a race that finished")
    t, v = result.t, result.v
    thrust = result.force_terms["thrust_n"]
    work = _work(thrust, v, t)
    drag = _work(result.force_terms["drag_n"], v, t)
    rolling = _work(result.force_terms["rolling_n"], v, t)
    kinetic = 0.5 * mass_kg * float(v[-1]) ** 2
    powered = np.nonzero(thrust > 0)[0]
    end = int(powered[-1]) if powered.size else 0
    return EnergyAudit(
        thrust_work_j=work,
        drag_loss_j=drag,
        rolling_loss_j=rolling,
        kinetic_energy_j=kinetic,
        thrust_end_s=float(t[end]),
        kinetic_energy_at_thrust_end_j=0.5 * mass_kg * float(v[end]) ** 2,
        closure_error_j=work - drag - rolling - kinetic,
    )


def audit_car(car: CarParams) -> EnergyAudit:
    """Simulate `car` with drag and rolling losses (M2) and audit the run."""
    return audit(simulate(car, ModelLevel.M2), car.mass_kg)


def compare(baseline: EnergyAudit, candidate: EnergyAudit) -> dict[str, float]:
    """Change in each energy term from `baseline` to `candidate` (negative is lower)."""
    return {
        "thrust_work_j": candidate.thrust_work_j - baseline.thrust_work_j,
        "kinetic_energy_j": candidate.kinetic_energy_j - baseline.kinetic_energy_j,
        "drag_loss_j": candidate.drag_loss_j - baseline.drag_loss_j,
        "rolling_loss_j": candidate.rolling_loss_j - baseline.rolling_loss_j,
        "conversion_efficiency": candidate.conversion_efficiency - baseline.conversion_efficiency,
    }
