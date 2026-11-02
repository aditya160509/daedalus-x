"""Structural analysis (T21): beam finite elements for wings, axles, posts and the rule load tests.

The India NF scorecard rewards "proven design improvements made based on FEA/CFD study", and
the regulations themselves load the car in scrutineering: 200 g on each tether guide (T6.3),
100 g on each wheel (T7.13) and a 1 kg load on the halo notch (T4.4.5, "to be reviewed"). Most
of those parts are slender, so Euler-Bernoulli beam elements give deflection, bending moment and
stress quickly and transparently. Full 3D FEA (CalculiX) is the next step for chunky parts.

Every result is only as good as the material numbers. The values in MATERIALS are typical
handbook figures marked `estimated`; the model block foam has no entry because its properties
must be measured or taken from the supplier's datasheet.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]
G0 = 9.80665
Support = Literal["fixed", "pinned"]

# Load tests the regulations apply in scrutineering, as hanging masses (kg).
RULE_LOAD_TESTS = {
    "T6.3 tether guide": 0.2,
    "T7.13 wheel": 0.1,
    "T4.4.5 halo notch": 1.0,  # the text says the load is "to be reviewed"
}


class StructureError(ValueError):
    """Raised when a beam, its supports or its loads cannot define a solvable problem."""


@dataclass(frozen=True)
class Material:
    name: str
    youngs_modulus_pa: float
    strength_pa: float  # yield, or tensile strength for brittle materials
    source: Literal["measured", "estimated"]
    note: str = ""

    def __post_init__(self) -> None:
        if self.youngs_modulus_pa <= 0 or self.strength_pa <= 0:
            raise StructureError("modulus and strength must be positive")


MATERIALS = {
    "aluminium_6061_t6": Material("Aluminium 6061-T6", 68.9e9, 276e6, "estimated", "handbook"),
    "steel_mild": Material("Mild steel", 200e9, 250e6, "estimated", "handbook"),
    "abs": Material("ABS (moulded)", 2.2e9, 40e6, "estimated", "typical; 3D prints are weaker"),
    "pla": Material("PLA (moulded)", 3.5e9, 50e6, "estimated", "typical; 3D prints are weaker"),
}


@dataclass(frozen=True)
class Section:
    """Bending properties about the loaded axis."""

    second_moment_m4: float
    extreme_fibre_m: float  # distance from the neutral axis to the outermost fibre

    @classmethod
    def rectangle(cls, width_m: float, depth_m: float) -> Section:
        """Depth is measured in the direction of the load (a wing's thickness)."""
        if width_m <= 0 or depth_m <= 0:
            raise StructureError("rectangle sides must be positive")
        return cls(width_m * depth_m**3 / 12.0, depth_m / 2.0)

    @classmethod
    def circle(cls, diameter_m: float) -> Section:
        if diameter_m <= 0:
            raise StructureError("diameter must be positive")
        return cls(math.pi * diameter_m**4 / 64.0, diameter_m / 2.0)

    @classmethod
    def tube(cls, outer_m: float, inner_m: float) -> Section:
        if not 0 <= inner_m < outer_m:
            raise StructureError("tube needs 0 <= inner < outer diameter")
        return cls(math.pi * (outer_m**4 - inner_m**4) / 64.0, outer_m / 2.0)


@dataclass(frozen=True)
class BeamResult:
    x_m: FloatArray
    deflection_m: FloatArray
    moment_nm: FloatArray
    max_deflection_m: float
    max_moment_nm: float
    max_stress_pa: float
    safety_factor: float
    material: Material

    def to_mapping(self) -> dict[str, object]:
        return {
            "max_deflection_mm": self.max_deflection_m * 1000.0,
            "max_moment_nmm": self.max_moment_nm * 1000.0,
            "max_stress_mpa": self.max_stress_pa / 1e6,
            "safety_factor": self.safety_factor,
            "material": self.material.name,
            "material_source": self.material.source,
        }


def _element_stiffness(ei: float, length: float) -> FloatArray:
    lsq = length * length
    return (ei / length**3) * np.array(
        [
            [12.0, 6.0 * length, -12.0, 6.0 * length],
            [6.0 * length, 4.0 * lsq, -6.0 * length, 2.0 * lsq],
            [-12.0, -6.0 * length, 12.0, -6.0 * length],
            [6.0 * length, 2.0 * lsq, -6.0 * length, 4.0 * lsq],
        ]
    )


def _mesh(length: float, elements: int, points: Sequence[float]) -> FloatArray:
    base = np.linspace(0.0, length, elements + 1)
    return np.unique(np.concatenate([base, np.asarray(points, dtype=np.float64)]))


def solve_beam(
    length_m: float,
    section: Section,
    material: Material,
    *,
    supports: dict[float, Support],
    point_loads_n: dict[float, float] | None = None,
    distributed_n_per_m: float = 0.0,
    elements: int = 40,
) -> BeamResult:
    """Deflection, bending moment and peak bending stress of a straight prismatic beam.

    Positions are metres from one end. Loads act in one plane; positive means the same
    direction as positive deflection.
    """
    loads = point_loads_n or {}
    if length_m <= 0 or elements < 1:
        raise StructureError("need a positive length and at least one element")
    positions = [*supports, *loads]
    if any(not 0.0 <= p <= length_m for p in positions):
        raise StructureError("supports and loads must lie on the beam")
    x = _mesh(length_m, elements, positions)
    ei = material.youngs_modulus_pa * section.second_moment_m4
    dofs = 2 * x.size
    stiffness = np.zeros((dofs, dofs))
    force = np.zeros(dofs)
    for e in range(x.size - 1):
        le = x[e + 1] - x[e]
        idx = slice(2 * e, 2 * e + 4)
        stiffness[idx, idx] += _element_stiffness(ei, le)
        q = distributed_n_per_m
        force[idx] += q * le / 12.0 * np.array([6.0, le, 6.0, -le])
    for pos, value in loads.items():
        force[2 * int(np.argmin(np.abs(x - pos)))] += value
    fixed: list[int] = []
    for pos, kind in supports.items():
        node = int(np.argmin(np.abs(x - pos)))
        fixed.append(2 * node)
        if kind == "fixed":
            fixed.append(2 * node + 1)
    free = np.setdiff1d(np.arange(dofs), fixed)
    reduced = stiffness[np.ix_(free, free)]
    if np.linalg.matrix_rank(reduced) < free.size:
        raise StructureError("the supports do not hold the beam (it can move as a mechanism)")
    u = np.zeros(dofs)
    u[free] = np.linalg.solve(reduced, force[free])
    deflection = u[0::2]
    moment = _nodal_moments(x, u, ei)
    peak_moment = float(np.max(np.abs(moment)))
    stress = peak_moment * section.extreme_fibre_m / section.second_moment_m4
    return BeamResult(
        x_m=x,
        deflection_m=deflection,
        moment_nm=moment,
        max_deflection_m=float(np.max(np.abs(deflection))),
        max_moment_nm=peak_moment,
        max_stress_pa=stress,
        safety_factor=math.inf if stress == 0 else material.strength_pa / stress,
        material=material,
    )


def _nodal_moments(x: FloatArray, u: FloatArray, ei: float) -> FloatArray:
    """Bending moment at each node from the Hermite curvature, averaged where elements meet."""
    total = np.zeros(x.size)
    count = np.zeros(x.size)
    for e in range(x.size - 1):
        le = x[e + 1] - x[e]
        w1, t1, w2, t2 = u[2 * e : 2 * e + 4]
        start = (-6.0 * w1 - 4.0 * le * t1 + 6.0 * w2 - 2.0 * le * t2) / le**2
        end = (6.0 * w1 + 2.0 * le * t1 - 6.0 * w2 + 4.0 * le * t2) / le**2
        total[e] += ei * start
        total[e + 1] += ei * end
        count[e] += 1
        count[e + 1] += 1
    return total / count


def hanging_load_n(mass_kg: float) -> float:
    """Weight of a hanging test mass in newtons."""
    return mass_kg * G0
