"""Race analysis : where the race time goes and what moves it.

Three views a team and a judge can act on, all computed with TITAN M2 through the vectorised
`montecarlo.race_times`, so every number comes from the same model as the race prediction:

* time budget: milliseconds lost to drag, to rolling resistance and to mass above the legal
  minimum (each found by switching that loss off), plus the driver's reaction time;
* tornado: change in race time when each input moves by +/-10%, largest swing first;
* exchange rates: milliseconds per gram, per cm^2 of CdA, per 0.001 of Crr and per 1% of thrust,
  the "what is a millimetre worth" table for the verbal presentation.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from daedalus.dynamics import ModelLevel, ThrustCurve
from daedalus.montecarlo import race_times

INPUTS = ("mass", "cda", "crr", "thrust", "rho")
LEGAL_MIN_MASS_KG = 0.050  # India NF 2025-26 T3.6


class RaceAnalysisError(ValueError):
    """Raised when the car cannot finish or the inputs are not physical."""


@dataclass(frozen=True)
class Car:
    thrust: ThrustCurve
    mass_kg: float
    cda_m2: float
    crr: float
    rho_kg_m3: float = 1.204
    track_m: float = 20.0

    def __post_init__(self) -> None:
        if self.mass_kg <= 0 or self.cda_m2 < 0 or self.crr < 0 or self.rho_kg_m3 <= 0:
            raise RaceAnalysisError("mass and density must be positive; CdA and Crr non-negative")


def _times(
    car: Car,
    *,
    mass: list[float],
    cda: list[float],
    crr: list[float],
    thrust: list[float],
    rho: float | None = None,
    dt_s: float = 1e-4,
) -> np.ndarray:
    times = race_times(
        car.thrust,
        np.asarray(thrust),
        np.asarray(mass),
        np.asarray(cda),
        np.asarray(crr),
        car.rho_kg_m3 if rho is None else rho,
        car.track_m,
        ModelLevel.M2,
        dt_s,
    )
    if not np.all(np.isfinite(times)):
        raise RaceAnalysisError("the car does not finish the track with these inputs")
    return np.asarray(times, dtype=np.float64)


def time_budget(
    car: Car, *, reaction_s: float = 0.0, min_mass_kg: float = LEGAL_MIN_MASS_KG
) -> dict[str, float]:
    """Race time in ms and the ms each loss costs, found by switching that loss off."""
    if reaction_s < 0:
        raise RaceAnalysisError("reaction time cannot be negative")
    floor = min(car.mass_kg, min_mass_kg)
    m, a, r = car.mass_kg, car.cda_m2, car.crr
    t = _times(car, mass=[m, m, m, floor], cda=[a, 0.0, a, a], crr=[r, r, 0.0, r], thrust=[1.0] * 4)
    return {
        "car_time_ms": float(t[0] * 1000),
        "drag_ms": float((t[0] - t[1]) * 1000),
        "rolling_ms": float((t[0] - t[2]) * 1000),
        "mass_above_minimum_ms": float((t[0] - t[3]) * 1000),
        "reaction_ms": reaction_s * 1000,
        "total_time_ms": float(t[0] * 1000 + reaction_s * 1000),
    }


def tornado(car: Car, *, relative: float = 0.10) -> list[dict[str, float | str]]:
    """Race-time change in ms for each input at -relative and +relative, largest swing first."""
    if not 0 < relative < 0.5:
        raise RaceAnalysisError("relative change must be between 0 and 0.5")
    lo, hi = 1 - relative, 1 + relative
    m, a, r = car.mass_kg, car.cda_m2, car.crr
    base = _times(car, mass=[m], cda=[a], crr=[r], thrust=[1.0])[0]
    t = _times(
        car,
        mass=[m * lo, m * hi, m, m, m, m, m, m],
        cda=[a, a, a * lo, a * hi, a, a, a, a],
        crr=[r, r, r, r, r * lo, r * hi, r, r],
        thrust=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, lo, hi],
    )
    rho_t = _times(
        car, mass=[m, m], cda=[a, a], crr=[r, r], thrust=[1.0, 1.0], rho=car.rho_kg_m3 * lo
    )
    rho_hi = _times(car, mass=[m], cda=[a], crr=[r], thrust=[1.0], rho=car.rho_kg_m3 * hi)
    rows = [
        ("mass", t[0], t[1]),
        ("cda", t[2], t[3]),
        ("crr", t[4], t[5]),
        ("thrust", t[6], t[7]),
        ("rho", rho_t[0], rho_hi[0]),
    ]
    out: list[dict[str, float | str]] = [
        {
            "input": name,
            "low_ms": float((low - base) * 1000),
            "high_ms": float((high - base) * 1000),
        }
        for name, low, high in rows
    ]
    return sorted(out, key=lambda row: -abs(float(row["high_ms"]) - float(row["low_ms"])))


def exchange_rates(car: Car) -> dict[str, float]:
    """Milliseconds of race time per unit change of each design input (central differences)."""
    m, a, r = car.mass_kg, car.cda_m2, car.crr
    dm, da, dr, dthrust = 0.001, 1e-4, 0.001, 0.01  # 1 g, 1 cm^2, 0.001 Crr, 1% thrust
    t = _times(
        car,
        mass=[m + dm, max(m - dm, 1e-6), m, m, m, m, m, m],
        cda=[a, a, a + da, max(a - da, 0.0), a, a, a, a],
        crr=[r, r, r, r, r + dr, max(r - dr, 0.0), r, r],
        thrust=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1 + dthrust, 1 - dthrust],
    )
    return {
        "ms_per_gram": float((t[0] - t[1]) / 2 * 1000),
        "ms_per_cm2_cda": float((t[2] - t[3]) / (2 if a >= da else 1) * 1000),
        "ms_per_0p001_crr": float((t[4] - t[5]) / (2 if r >= dr else 1) * 1000),
        "ms_per_percent_thrust": float((t[6] - t[7]) / 2 * 1000),
    }
