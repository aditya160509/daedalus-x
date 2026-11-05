"""VTK XML layers for the in-browser 3D flow viewer (vtk.js).

Reads a finished half-model OpenFOAM case with the shared reader, mirrors about y = 0 and writes
zlib-compressed, base64-inline VTK XML files that vtk.js parses directly:

- ``surface.vtp``: decimated car surface, point array ``Cp`` = p / (0.5 U^2);
- ``streamlines.vtp``: polylines from an upstream rake, point array ``U_Uinf``;
- ``volume.vti``: field resampled onto a ~64^3 image (``U_Uinf``, ``Ux_Uinf``, ``Cp``) for slicing;
- ``velocity.bin``: RGBA Float32 3D texture of ``U/U∞`` plus a validity mask, for GPU particle
  advection, with ``velocity.json`` holding its dimensions, origin and spacing.

Files are cached under ``<run>/viz/vtk`` and rebuilt when the solved fields are newer.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import numpy as np
import pyvista as pv
import vtk

from . import CAR_GROUPS, _reader
from .surface import separation_flags

Layer = Literal[
    "surface", "streamlines", "volume", "wake1", "wake1p5", "wake2", "vortex", "wall", "separation"
]
WAKE_POSITIONS = {"wake1": 1.0, "wake1p5": 1.5, "wake2": 2.0}
LAYERS: dict[str, str] = {
    "surface": "vtp",
    "streamlines": "vtp",
    "volume": "vti",
    **dict.fromkeys(WAKE_POSITIONS, "vtp"),
    "vortex": "vtp",
    "wall": "vtp",
    "separation": "vtp",
}
EXPORT_VERSION = 6
GRID_MAX = 64
SURFACE_TARGET_CELLS = 120_000
VELOCITY_COMPONENTS = ("u_over_uinf", "v_over_uinf", "w_over_uinf", "valid")


def _write(data: pv.DataSet, path: Path) -> None:
    writer: vtk.vtkXMLWriter = (
        vtk.vtkXMLImageDataWriter()
        if isinstance(data, pv.ImageData)
        else vtk.vtkXMLPolyDataWriter()
    )
    writer.SetInputData(data)
    writer.SetDataModeToBinary()  # inline base64: vtk.js reads it without appended-raw support
    writer.SetCompressorTypeToZLib()
    writer.SetHeaderTypeToUInt32()
    tmp = path.with_suffix(path.suffix + ".tmp")
    writer.SetFileName(str(tmp))
    if not writer.Write():
        raise RuntimeError(f"failed to write {path.name}")
    tmp.replace(path)


def _mirror(mesh: pv.PolyData) -> pv.PolyData:
    return mesh.merge(mesh.reflect((0, 1, 0), point=(0, 0, 0)))


def _surface(boundary: pv.MultiBlock, groups: list[str], q: float) -> pv.PolyData:
    parts = []
    for g in groups:
        block = boundary[g]
        if block is None:
            raise ValueError(f"car patch {g!r} missing from the OpenFOAM mesh")
        s = block.extract_surface(algorithm="dataset_surface").triangulate()
        cp = np.asarray(s.point_data["p"], float) / q
        s.clear_data()
        s.point_data["Cp"] = cp.astype(np.float32)
        parts.append(s)
    half = pv.merge(parts).clean()
    if half.n_cells > SURFACE_TARGET_CELLS // 2:
        reduction = 1.0 - (SURFACE_TARGET_CELLS // 2) / half.n_cells
        half = half.decimate_pro(reduction, preserve_topology=True)
    out = _mirror(half).compute_normals(auto_orient_normals=True, cell_normals=False)
    return out


def _wall_field(boundary: pv.MultiBlock, groups: list[str], *, separation: bool) -> pv.PolyData:
    parts = []
    for group in groups:
        block = boundary[group]
        if not isinstance(block, pv.DataSet) or "wallShearStress" not in block.point_data:
            raise ValueError(f"wall shear is unavailable on patch {group!r}")
        mesh = block.extract_surface(algorithm="dataset_surface").triangulate()
        traction = -np.asarray(mesh.point_data["wallShearStress"], dtype=np.float64)
        mesh.clear_data()
        if separation:
            flags = separation_flags(mesh, traction).astype(bool)
            faces = mesh.faces.reshape(-1, 4)[:, 1:]
            edges = np.vstack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
            edges = np.unique(np.sort(edges[flags[edges].all(axis=1)], axis=1), axis=0)
            if edges.size:
                lines = np.column_stack([np.full(len(edges), 2), edges]).ravel()
                part = pv.PolyData(mesh.points, lines=lines).clean()
                part.point_data["candidate"] = np.ones(part.n_points, dtype=np.float32)
                parts.append(part)
        else:
            mesh.point_data["traction"] = traction.astype(np.float32)
            mesh.point_data.active_vectors_name = "traction"
            parts.append(mesh)
    if not parts:
        return pv.PolyData()
    half = pv.merge(parts).clean()
    if not separation:
        half.point_data.active_vectors_name = "traction"
        if half.n_cells > SURFACE_TARGET_CELLS // 2:
            half = half.decimate_pro(1 - (SURFACE_TARGET_CELLS // 2) / half.n_cells)
    return _mirror(half)


def _streamlines(internal: pv.UnstructuredGrid, car: dict, u_inf: float) -> pv.PolyData:
    length, width, height = car["length_m"], car["width_m"], car["height_m"]
    yy, zz = np.meshgrid(
        np.linspace(0.003, width / 2 + 0.004, 7),
        np.linspace(0.003, height + 0.004, 5),
        indexing="ij",
    )
    seeds = pv.PolyData(np.column_stack([np.full(yy.size, -0.03), yy.ravel(), zz.ravel()]))
    lines = internal.streamlines_from_source(
        seeds,
        vectors="U",
        integration_direction="forward",
        max_length=length * 4,
        initial_step_length=0.2,
        step_unit="cl",
        max_steps=4000,
    )
    speed = np.linalg.norm(np.asarray(lines.point_data["U"], float), axis=1) / u_inf
    lines.clear_data()
    lines.point_data["U_Uinf"] = speed.astype(np.float32)
    return _mirror(lines)


def _sample_grid(
    internal: pv.UnstructuredGrid, car: dict
) -> tuple[pv.ImageData, np.ndarray, np.ndarray, np.ndarray]:
    """Resample the half-model fields onto a uniform grid, mirrored about y = 0.

    Points are ordered x fastest, then y, then z. The returned ``valid`` mask is false where the
    structured probe falls outside the OpenFOAM mesh (for example the solid car interior).
    """
    length, width, height = car["length_m"], car["width_m"], car["height_m"]
    lo = np.array([-0.06, -(width / 2 + 0.03), 0.0])
    hi = np.array([length + 0.12, width / 2 + 0.03, height + 0.04])
    spacing = float(np.max(hi - lo)) / (GRID_MAX - 1)
    dims = np.clip(np.ceil((hi - lo) / spacing - 1e-9).astype(int) + 1, 2, GRID_MAX)
    grid = pv.ImageData(dimensions=tuple(dims), spacing=(spacing,) * 3, origin=tuple(lo))
    pts = np.array(grid.points)
    pts[:, 1] = np.abs(pts[:, 1])
    sampled = pv.PolyData(pts).sample(internal)
    valid = np.asarray(sampled.point_data["vtkValidPointMask"], bool)
    return (
        grid,
        valid,
        np.asarray(sampled.point_data["U"], float),
        np.asarray(sampled.point_data["p"], float),
    )


def _volume(internal: pv.UnstructuredGrid, car: dict, u_inf: float, q: float) -> pv.ImageData:
    grid, valid, u, p = _sample_grid(internal, car)
    speed = np.where(valid, np.linalg.norm(u, axis=1) / u_inf, np.nan)
    ux = np.where(valid, u[:, 0] / u_inf, np.nan)
    cp = np.where(valid, p / q, np.nan)
    grid.point_data["U_Uinf"] = speed.astype(np.float32)
    grid.point_data["Ux_Uinf"] = ux.astype(np.float32)
    grid.point_data["Cp"] = cp.astype(np.float32)
    grid.point_data.active_scalars_name = "U_Uinf"
    return grid


def _wake_plane(
    internal: pv.UnstructuredGrid, car: dict, u_inf: float, x_over_l: float
) -> pv.PolyData:
    """Streamwise velocity ratio on a transverse plane, mirrored from the half model."""
    x = float(car["length_m"]) * x_over_l
    width, height = float(car["width_m"]), float(car["height_m"])
    plane = internal.slice(normal="x", origin=(x, 0, 0))
    if not plane.n_points:
        return pv.PolyData()
    plane = (
        plane.clip_box((x - 0.001, x + 0.001, 0, width / 2 + 0.03, 0, height + 0.03), invert=False)
        .extract_surface(algorithm="dataset_surface")
        .triangulate()
    )
    if not plane.n_points:
        return pv.PolyData()
    ux = np.asarray(plane.point_data["U"], float)[:, 0] / u_inf
    plane.clear_data()
    plane.point_data["Ux_Uinf"] = ux.astype(np.float32)
    return _mirror(plane)


def _vortices(internal: pv.UnstructuredGrid, car: dict, u_inf: float) -> pv.PolyData:
    """Q isosurfaces at Q/(U∞/L)² = 50 and 200, colored by dimensionless vorticity magnitude."""
    length = float(car["length_m"])
    derived = internal.compute_derivative(
        scalars="U", gradient=False, qcriterion=True, vorticity=True
    )
    surface = derived.contour(
        [50 * (u_inf / length) ** 2, 200 * (u_inf / length) ** 2], scalars="qcriterion"
    )
    if not surface.n_points:
        return pv.PolyData()
    omega = (
        np.linalg.norm(np.asarray(surface.point_data["vorticity"], float), axis=1) * length / u_inf
    )
    surface.clear_data()
    surface.point_data["omega_L_Uinf"] = omega.astype(np.float32)
    if surface.n_cells > SURFACE_TARGET_CELLS // 2:
        surface = surface.decimate_pro(1 - (SURFACE_TARGET_CELLS // 2) / surface.n_cells)
    return _mirror(surface)


def _velocity_texture(
    internal: pv.UnstructuredGrid, car: dict, u_inf: float
) -> tuple[np.ndarray, dict[str, object]]:
    """RGBA Float32 texture: u/U∞, v/U∞, w/U∞ and a validity mask, x fastest."""
    grid, valid, u, _ = _sample_grid(internal, car)
    y = np.asarray(grid.points)[:, 1]
    # The case is a half model on y >= 0: mirror the lateral component about the symmetry plane.
    v_half = u[:, 1] / u_inf
    ux = np.where(valid, u[:, 0] / u_inf, 0.0)
    uy = np.where(valid, np.where(y >= 0, v_half, -v_half), 0.0)
    uz = np.where(valid, u[:, 2] / u_inf, 0.0)
    texture = np.column_stack([ux, uy, uz, valid.astype(np.float32)]).astype("<f4")
    speed = np.linalg.norm(np.column_stack([ux, uy, uz]), axis=1)[valid]
    meta: dict[str, object] = {
        "version": EXPORT_VERSION,
        "format": "float32-le",
        "components": list(VELOCITY_COMPONENTS),
        "order": "x fastest, then y, then z; one RGBA texel per grid point",
        "dims": [int(v) for v in grid.dimensions],
        "origin_m": [float(v) for v in grid.origin],
        "spacing_m": [float(v) for v in grid.spacing],
        "bounds_m": [float(v) for v in grid.bounds],
        "U_m_s": u_inf,
        "valid_fraction": float(np.mean(valid)),
        "speed_ratio_range": [
            float(np.min(speed)) if speed.size else 0.0,
            float(np.max(speed)) if speed.size else 0.0,
        ],
        "provenance": "simulated",
    }
    return texture, meta


def export_velocity(case: Path, cache_dir: Path | None = None) -> tuple[Path, Path]:
    """Return cached ``velocity.bin`` and ``velocity.json`` for GPU particle advection."""
    case = Path(case)
    out_dir = cache_dir or case / "viz" / "vtk"
    path = out_dir / "velocity.bin"
    meta_path = out_dir / "velocity.json"
    stamp = out_dir / "velocity.stamp.json"
    latest = _latest_time(case)
    if latest is None:
        raise FileNotFoundError(f"{case} has no solved time directory")
    key = {"version": EXPORT_VERSION, "time": latest.name, "mtime": latest.stat().st_mtime}
    if (
        path.exists()
        and meta_path.exists()
        and stamp.exists()
        and json.loads(stamp.read_text()) == key
    ):
        return path, meta_path

    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    u_inf = float(manifest["reference"]["U_m_s"])
    if not np.isfinite(u_inf) or u_inf <= 0:
        raise ValueError("run manifest needs a positive finite reference speed")
    mesh = _reader(case, [])
    internal = mesh["internalMesh"]
    if not isinstance(internal, pv.UnstructuredGrid):
        raise ValueError(f"{case}: unexpected OpenFOAM reader output for internalMesh")
    texture, meta = _velocity_texture(internal, manifest["car"], u_inf)
    out_dir.mkdir(parents=True, exist_ok=True)
    path.write_bytes(texture.tobytes(order="C"))
    meta = {**meta, "bytes": path.stat().st_size, "time": latest.name, "source": case.name}
    meta_path.write_text(json.dumps(meta, indent=1))
    stamp.write_text(json.dumps(key))
    return path, meta_path


def _latest_time(case: Path) -> Path | None:
    times = [d for d in case.iterdir() if d.is_dir() and _is_float(d.name) and float(d.name) > 0]
    return max(times, key=lambda d: float(d.name)) if times else None


def _is_float(s: str) -> bool:
    try:
        float(s)
    except ValueError:
        return False
    return True


def export_layer(case: Path, layer: str, cache_dir: Path | None = None) -> Path:
    """Return the cached VTK XML file for ``layer``, building it if missing or stale."""
    if layer not in LAYERS:
        raise KeyError(layer)
    case = Path(case)
    out_dir = cache_dir or case / "viz" / "vtk"
    path = out_dir / f"{layer}.{LAYERS[layer]}"
    stamp = out_dir / "stamp.json"
    latest = _latest_time(case)
    if latest is None:
        raise FileNotFoundError(f"{case} has no solved time directory")
    key = {"version": EXPORT_VERSION, "time": latest.name, "mtime": latest.stat().st_mtime}
    if path.exists() and stamp.exists() and json.loads(stamp.read_text()) == key:
        return path

    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    u_inf = float(manifest["reference"]["U_m_s"])
    q = 0.5 * u_inf**2
    car = manifest["car"]
    if (
        not np.isfinite(u_inf)
        or u_inf <= 0
        or not np.isfinite(car["length_m"])
        or car["length_m"] <= 0
    ):
        raise ValueError("run manifest needs positive finite reference speed and car length")
    groups = [g for g in car["groups"] if g in CAR_GROUPS]
    mesh = _reader(case, groups if layer in ("surface", "wall", "separation") else [])
    internal = mesh["internalMesh"]
    if layer == "surface":
        data: pv.DataSet = _surface(mesh["boundary"], groups, q)
    elif layer in ("wall", "separation"):
        data = _wall_field(mesh["boundary"], groups, separation=layer == "separation")
    elif layer == "streamlines":
        data = _streamlines(internal, car, u_inf)
    elif layer == "volume":
        data = _volume(internal, car, u_inf, q)
    elif layer in WAKE_POSITIONS:
        data = _wake_plane(internal, car, u_inf, WAKE_POSITIONS[layer])
    else:
        data = _vortices(internal, car, u_inf)

    out_dir.mkdir(parents=True, exist_ok=True)
    if stamp.exists() and json.loads(stamp.read_text()) != key:
        for old in out_dir.glob("*.vt?"):
            old.unlink()
    _write(data, path)
    stamp.write_text(json.dumps(key))
    return path


def probe_cp(
    internal: pv.DataSet, start_m: list[float], end_m: list[float], u_inf: float
) -> list[tuple[float, float | None]]:
    """Sample kinematic pressure along a full-car line against a mirrored half-domain."""
    if not np.isfinite(u_inf) or u_inf <= 0 or "p" not in internal.point_data:
        raise ValueError("probe requires a pressure field and a positive inlet speed")
    length = float(np.linalg.norm(np.subtract(end_m, start_m)))
    if not np.isfinite(length) or length == 0:
        raise ValueError("probe endpoints must be finite and different")
    xyz = np.linspace(start_m, end_m, 101)
    xyz[:, 1] = np.abs(xyz[:, 1])
    sampled = pv.PolyData(xyz).sample(internal)
    cp = np.asarray(sampled.point_data["p"]) / (0.5 * u_inf**2)
    valid = np.asarray(sampled.point_data["vtkValidPointMask"], bool) & np.isfinite(cp)
    return [(length * i / 100, float(value) if valid[i] else None) for i, value in enumerate(cp)]
