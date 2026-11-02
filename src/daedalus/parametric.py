"""Canonical ORACLE study-car generator (millimetres, engineering X downstream / Z up).

This is a parametrised study family, not a reconstruction of the team's manufactured car.
The official halo, load tests, manufacturing tolerances and decals still need human review.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import build123d as bd
import numpy as np

from daedalus import oracle

VERSION = "study-car-v1"


@dataclass(frozen=True)
class Dimensions:
    length_mm: float
    width_mm: float
    height_mm: float

    @classmethod
    def from_design(cls, directory: Path) -> Dimensions:
        try:
            geometry = json.loads((directory / "geometry.json").read_text())
            return cls(
                *(float(geometry[name]) * 1000 for name in ("length_m", "width_m", "height_m"))
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(
                "Baseline geometry must provide numeric length, width and height"
            ) from exc

    def validate(self) -> None:
        if not (
            205 <= self.length_mm <= 225
            and 65 <= self.width_mm <= 85
            and 45 <= self.height_mm <= 65
        ):
            raise ValueError("Study family requires baseline extents 205-225 x 65-85 x 45-65 mm")


def feasible(unit: np.ndarray) -> np.ndarray:
    """Cheap family constraints before expensive CAD; rear-wing chord must be 15-25 mm."""
    return oracle.study_feasible(unit)


def _profile(x: float, width: float, height: float) -> bd.Sketch:
    return bd.Pos(0, 0, 3 + height / 2) * (bd.Plane.YZ.offset(x) * bd.Rectangle(width, height))


def assembly(unit: tuple[float, ...], dimensions: Dimensions) -> bd.Compound:
    dimensions.validate()
    if len(unit) != oracle.DIM or not bool(feasible(np.array(unit))[0]):
        raise ValueError("Candidate outside family/rule bounds (rear chord must be 15-25 mm)")
    angle, taper, nose_height, rear_chord = oracle.to_physical(np.array(unit)).tolist()
    length, width, height = dimensions.length_mm, dimensions.width_mm, dimensions.height_mm
    body_width = 28.0
    body = bd.loft(
        [
            _profile(20, body_width * taper, nose_height),
            _profile(85, body_width, height - 3),
            _profile(length, body_width, height - 3),
        ],
        ruled=True,
    )
    # Blind chamber: 50 mm insertion length, open aft. Keep fixed chamber shoulder width.
    bore = bd.Pos(length - 24.5, 0, 32.5) * bd.Cylinder(9.1, 51).rotate(bd.Axis.Y, 90)
    body = body - bore
    body.label = "Main Body"
    nose = bd.loft([_profile(0, 3, 2), _profile(20, body_width * taper, nose_height)], ruled=True)
    nose.label = "Nose Cone"
    front = bd.Pos(12, 0, 9) * bd.Box(20, 60, 3).rotate(bd.Axis.Y, angle)
    front.label = "Front Wing"
    rear_x = 189 + rear_chord / 2
    rear = bd.Pos(rear_x, 0, 40) * bd.Box(rear_chord, width, 3)
    rear.label = "Rear Wing"
    parts = [body, nose, front, rear]
    for name, x, contact, gap in (("front", 40, 14, 40), ("rear", 170, 18, 32)):
        for side in (-1, 1):
            wheel = bd.Pos(x, side * (gap + contact) / 2, 15) * bd.Cylinder(15, contact).rotate(
                bd.Axis.X, 90
            )
            wheel.label = f"f1_wheel_{name}_{'left' if side > 0 else 'right'}"
            parts.append(wheel)
        support = bd.Pos(x, 0, 15) * bd.Cylinder(1.5, gap + contact).rotate(bd.Axis.X, 90)
        support.label = f"axle_{name}"
        parts.append(support)
    cartridge = bd.Pos(length - 22.5, 0, 32.5) * bd.Cylinder(9, 65).rotate(bd.Axis.Y, 90)
    cartridge.label = "CO2 Cartridge"  # canonical label only: organiser gas remains unconfirmed
    parts.append(cartridge)
    result = bd.Compound(children=parts, label=VERSION)
    if not result.is_valid or any(not part.solids() for part in parts):
        raise ValueError("Generated car contains invalid/empty CAD solids")
    if not all(math.isfinite(part.volume) and part.volume > 0 for part in parts):
        raise ValueError("Generated car has non-positive component volume")
    return result


def write_step(unit: tuple[float, ...], dimensions: Dimensions, path: Path) -> None:
    bd.export_step(assembly(unit, dimensions), path)
