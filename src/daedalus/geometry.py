"""Geometry adapter: STEP assembly -> engineering frame -> CFD surfaces + display GLB (spec §4.1).

Engineering frame (spec §4.1b): x points downstream from the nose (nose at x = 0), y is
lateral with the car's symmetry plane at y = 0, z is up with the wheel contact plane at z = 0.
Units are metres. Each part is assigned to one force group, which becomes one CFD patch, so
component forces come straight from the solver.
"""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
from dataclasses import asdict, dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any, TypedDict, cast

import numpy as np
import trimesh
from build123d import Shape, Solid, export_stl, import_step
from numpy.typing import NDArray

MM_TO_M = 1e-3


class ForceGroup(StrEnum):
    BODY = "body"
    FRONT_WING = "front_wing"
    REAR_WING = "rear_wing"
    WHEELS = "wheels"
    CARTRIDGE = "cartridge"
    INTERNAL = "internal"  # fully enclosed parts (e.g. cargo block): never meshed


# Name patterns are matched against the STEP part label (case-insensitive), first match wins.
GROUP_RULES: tuple[tuple[str, ForceGroup], ...] = (
    (r"front[_\s-]*wing", ForceGroup.FRONT_WING),
    (r"rear[_\s-]*wing", ForceGroup.REAR_WING),
    (r"wheel|axle|bush|bearing", ForceGroup.WHEELS),
    (r"co2|cartridge|canister", ForceGroup.CARTRIDGE),
    (r"cargo|ballast|internal", ForceGroup.INTERNAL),
    (r"body|chassis|main", ForceGroup.BODY),
)


class GeometryError(Exception):
    pass


@dataclass(frozen=True)
class FrameTransform:
    """Source CAD frame -> engineering frame. Stored with every artifact (spec §4.1b)."""

    source_units: str
    scale_to_m: float
    forward_axis: str  # source axis pointing from tail to nose, e.g. "-Y"
    up_axis: str  # source axis pointing up, e.g. "+Z"
    rotation: tuple[tuple[float, float, float], ...]  # 3x3, source -> engineering (unitless)
    translation_m: tuple[float, float, float]  # applied after rotation and scaling

    def apply(self, points: NDArray[np.float64]) -> NDArray[np.float64]:
        r = np.asarray(self.rotation)
        out = (points @ r.T) * self.scale_to_m + np.asarray(self.translation_m)
        return np.asarray(out, dtype=np.float64)


@dataclass(frozen=True)
class Part:
    label: str
    group: ForceGroup
    volume_m3: float
    bbox_min_m: tuple[float, float, float]
    bbox_max_m: tuple[float, float, float]


class Axle(TypedDict):
    axis: tuple[float, float, float]
    origin: tuple[float, float, float]
    radius_m: float


@dataclass(frozen=True)
class GeometryReport:
    source_file: str
    source_sha256: str
    transform: FrameTransform
    length_m: float
    width_m: float
    height_m: float
    frontal_area_m2: float
    parts: tuple[Part, ...]
    groups: dict[str, list[str]] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()
    schema_version: int = 2
    axles: dict[str, Axle] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


def classify(label: str) -> ForceGroup | None:
    for pattern, group in GROUP_RULES:
        if re.search(pattern, label, flags=re.IGNORECASE):
            return group
    return None


_AXES = {"X": np.array([1.0, 0, 0]), "Y": np.array([0, 1.0, 0]), "Z": np.array([0, 0, 1.0])}


def _axis(spec: str) -> NDArray[np.float64]:
    m = re.fullmatch(r"([+-])([XYZ])", spec)
    if not m:
        raise GeometryError(f"axis must look like '+X' or '-Y', got {spec!r}")
    return _AXES[m.group(2)] * (1.0 if m.group(1) == "+" else -1.0)


def rotation_for(forward_axis: str, up_axis: str) -> NDArray[np.float64]:
    """Rows are the engineering x, y, z axes expressed in source coordinates."""
    nose = _axis(forward_axis)
    up = _axis(up_axis)
    if abs(float(nose @ up)) > 1e-9:
        raise GeometryError("forward and up axes must be perpendicular")
    ex = -nose  # downstream = tail direction
    ez = up
    ey = np.cross(ez, ex)  # right-handed: x downstream, z up -> y to the car's left
    return np.asarray(np.vstack([ex, ey, ez]), dtype=np.float64)


def _labelled_solids(shape: Shape[Any]) -> list[tuple[str, Solid]]:
    out: list[tuple[str, Solid]] = []

    def walk(node: Shape[Any], inherited: str) -> None:
        label = getattr(node, "label", "") or inherited
        children = list(getattr(node, "children", ()) or ())
        if children:
            for child in children:
                walk(child, label)
            return
        for solid in node.solids():
            out.append((label or "unnamed", solid))

    walk(shape, "")
    return out


def _tessellate(solid: Shape[Any], tolerance_mm: float) -> trimesh.Trimesh:
    # BRepMesh via export_stl is robust where Shape.tessellate fails on untriangulated faces.
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "part.stl"
        if not export_stl(solid, path, tolerance=tolerance_mm, angular_tolerance=0.2):
            raise GeometryError("tessellation failed")
        mesh = trimesh.load_mesh(path, file_type="stl", process=True)
    if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
        raise GeometryError("tessellation produced no triangles")
    return mesh


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def import_car(
    step_path: Path,
    out_dir: Path,
    *,
    forward_axis: str,
    up_axis: str,
    source_units: str = "mm",
    tolerance_mm: float = 0.05,
) -> GeometryReport:
    """Import a STEP car, write per-group STL (metres) and a named GLB, return the report.

    Writes: out_dir/cfd/<group>.stl, out_dir/display.glb, out_dir/geometry.json
    """
    if (out_dir / "geometry.json").exists():
        raise FileExistsError(f"{out_dir} already has a geometry revision; choose a new directory")
    if source_units != "mm":
        raise GeometryError("only millimetre STEP sources are supported")
    shape = import_step(step_path)
    if not shape.is_valid:
        raise GeometryError(f"{step_path.name}: STEP shape is not valid")
    solids = _labelled_solids(shape)
    if not solids:
        raise GeometryError(f"{step_path.name}: no solids found")

    rot = rotation_for(forward_axis, up_axis)
    meshes: list[tuple[str, ForceGroup | None, trimesh.Trimesh, float]] = []
    centres: list[NDArray[np.float64]] = []
    radii: list[float] = []
    for label, solid in solids:
        mesh = _tessellate(solid, tolerance_mm)
        mesh.vertices = (mesh.vertices @ rot.T) * MM_TO_M
        meshes.append((label, classify(label), mesh, solid.volume * MM_TO_M**3))
        centres.append((rot @ np.asarray(tuple(solid.center()))) * MM_TO_M)
        radii.append(
            float(np.abs(rot[2]) @ np.asarray(tuple(solid.bounding_box().size))) * MM_TO_M / 2
        )

    allv = np.vstack([m.vertices for _, _, m, _ in meshes])
    lo, hi = allv.min(axis=0), allv.max(axis=0)
    shift = np.array([-lo[0], -(lo[1] + hi[1]) / 2.0, -lo[2]])
    for _, _, m, _ in meshes:
        m.vertices = m.vertices + shift

    transform = FrameTransform(
        source_units=source_units,
        scale_to_m=MM_TO_M,
        forward_axis=forward_axis,
        up_axis=up_axis,
        rotation=tuple(tuple(float(v) for v in row) for row in rot),  # type: ignore[misc]
        translation_m=(float(shift[0]), float(shift[1]), float(shift[2])),
    )

    warnings: list[str] = []
    body_meshes = [m for _, g, m, _ in meshes if g is ForceGroup.BODY]
    parts: list[Part] = []
    groups: dict[str, list[trimesh.Trimesh]] = {}
    for label, group, mesh, vol in meshes:
        if group is None:
            group = ForceGroup.BODY
            warnings.append(f"part {label!r} matched no rule; assigned to body")
        if group is ForceGroup.INTERNAL and not _enclosed(mesh, body_meshes):
            warnings.append(f"part {label!r} is not fully inside the body; meshed as body")
            group = ForceGroup.BODY
        if not mesh.is_watertight:
            warnings.append(f"part {label!r} tessellation is not watertight")
        b = mesh.bounds
        parts.append(
            Part(
                label=label,
                group=group,
                volume_m3=vol,
                bbox_min_m=tuple(float(v) for v in b[0]),  # type: ignore[arg-type]
                bbox_max_m=tuple(float(v) for v in b[1]),  # type: ignore[arg-type]
            )
        )
        if group is not ForceGroup.INTERNAL:
            groups.setdefault(group.value, []).append(mesh)

    # Keep semantic parts/GLB in the parent wheels group; only CFD surfaces split by axle.
    # shortcut: two circular axles share a radius per axle; generalise for other wheel layouts.
    axles: dict[str, Axle] = {}
    axle_members: dict[str, list[int]] = {}
    wheel_indices = [i for i, part in enumerate(parts) if part.group is ForceGroup.WHEELS]
    if wheel_indices:
        xs = [float(centres[i][0] + shift[0]) for i in wheel_indices]
        midpoint = (min(xs) + max(xs)) / 2
        groups.pop("wheels")
        for name, front in (("wheels_front", True), ("wheels_rear", False)):
            indices = [i for i in wheel_indices if (centres[i][0] + shift[0] <= midpoint) == front]
            if not indices:
                raise GeometryError("wheel solids must identify two distinct axle positions")
            radius = max(radii[i] for i in indices)
            if radius <= 0:
                raise GeometryError(f"{name}: wheel radius must be positive")
            # Largest wheel solids define the rolling radius; bushes share the axle position.
            wheel_centres = [
                float(centres[i][0] + shift[0])
                for i in indices
                if np.isclose(
                    radii[i],
                    radius,
                    rtol=1e-3,
                )
            ]
            axles[name] = {
                "axis": (0.0, 1.0, 0.0),
                "origin": (float(np.mean(wheel_centres)), 0.0, radius),
                "radius_m": radius,
            }
            groups[name] = [meshes[i][2] for i in indices]
            axle_members[name] = indices

    cfd_dir = out_dir / "cfd"
    cfd_dir.mkdir(parents=True, exist_ok=True)
    for name, ms in groups.items():
        trimesh.util.concatenate(ms).export(cfd_dir / f"{name}.stl", file_type="stl_ascii")

    _export_glb(meshes, parts, out_dir / "display.glb")

    external = cast(
        trimesh.Trimesh, trimesh.util.concatenate([m for ms in groups.values() for m in ms])
    )
    size = hi - lo
    report = GeometryReport(
        source_file=step_path.name,
        source_sha256=sha256_file(step_path),
        transform=transform,
        length_m=float(size[0]),
        width_m=float(size[1]),
        height_m=float(size[2]),
        frontal_area_m2=frontal_area(external),
        parts=tuple(parts),
        groups={
            **{g: [p.label for p in parts if p.group.value == g] for g in groups if g not in axles},
            **{g: [parts[i].label for i in members] for g, members in axle_members.items()},
            **({"wheels": [parts[i].label for i in wheel_indices]} if wheel_indices else {}),
        },
        axles=axles,
        warnings=tuple(warnings),
    )
    (out_dir / "geometry.json").write_text(report.to_json())
    return report


def _enclosed(mesh: trimesh.Trimesh, containers: list[trimesh.Trimesh]) -> bool:
    if not containers:
        return False
    pts = mesh.vertices[:: max(1, len(mesh.vertices) // 200)]
    return any(bool(np.all(c.contains(pts))) for c in containers if c.is_watertight)


def frontal_area(mesh: trimesh.Trimesh, resolution_m: float = 2e-4) -> float:
    """Area of the silhouette projected onto the y-z plane, by rasterisation."""
    yz = mesh.vertices[:, 1:]
    lo = yz.min(axis=0)
    shape = np.ceil((yz.max(axis=0) - lo) / resolution_m).astype(int) + 2
    grid = np.zeros(shape, dtype=bool)
    tri = (yz[mesh.faces] - lo) / resolution_m
    for a, b, c in tri:
        _fill_triangle(grid, a, b, c)
    return float(grid.sum() * resolution_m**2)


def _fill_triangle(
    grid: NDArray[np.bool_],
    a: NDArray[np.float64],
    b: NDArray[np.float64],
    c: NDArray[np.float64],
) -> None:
    xmin, ymin = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
    xmax, ymax = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
    if xmax <= xmin or ymax <= ymin:
        return
    xs, ys = np.meshgrid(np.arange(xmin, xmax) + 0.5, np.arange(ymin, ymax) + 0.5, indexing="ij")

    def edge(p: NDArray[np.float64], q: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.asarray(
            (q[0] - p[0]) * (ys - p[1]) - (q[1] - p[1]) * (xs - p[0]), dtype=np.float64
        )

    e0, e1, e2 = edge(a, b), edge(b, c), edge(c, a)
    inside = ((e0 >= 0) & (e1 >= 0) & (e2 >= 0)) | ((e0 <= 0) & (e1 <= 0) & (e2 <= 0))
    grid[xmin:xmax, ymin:ymax] |= inside


_GROUP_COLOURS = {
    ForceGroup.BODY: (0.86, 0.88, 0.90, 1.0),
    ForceGroup.FRONT_WING: (0.13, 0.83, 0.93, 1.0),
    ForceGroup.REAR_WING: (0.13, 0.83, 0.93, 1.0),
    ForceGroup.WHEELS: (0.12, 0.13, 0.15, 1.0),
    ForceGroup.CARTRIDGE: (0.70, 0.72, 0.75, 1.0),
    ForceGroup.INTERNAL: (0.5, 0.5, 0.5, 0.3),
}


def _export_glb(
    meshes: list[tuple[str, ForceGroup | None, trimesh.Trimesh, float]],
    parts: list[Part],
    path: Path,
) -> None:
    scene = trimesh.Scene()
    seen: dict[str, int] = {}
    for (label, _, mesh, _), part in zip(meshes, parts, strict=True):
        if part.group is ForceGroup.INTERNAL:
            continue
        n = seen.get(label, 0)
        seen[label] = n + 1
        name = f"{part.group.value}/{label}" + (f"#{n + 1}" if n else "")
        m = mesh.copy()
        m.visual = trimesh.visual.ColorVisuals(m, face_colors=_GROUP_COLOURS[part.group])
        scene.add_geometry(m, node_name=name, geom_name=name)
    path.write_bytes(scene.export(file_type="glb"))
