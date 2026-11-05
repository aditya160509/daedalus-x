"""Flow-field export for the Virtual Wind Tunnel (spec §4.4, P3-04).

Reads a finished half-model OpenFOAM case and writes versioned flow layers, mirrored about the
symmetry plane so the viewer shows the full car:

- ``surface``: car surface with pressure coefficient Cp = p / (0.5 U^2) per vertex
  (simpleFoam pressure is kinematic and the outlet reference is p = 0);
- ``streamlines``: integrated from a rake upstream of the nose, coloured by |U| / U_inf;
- ``wake`` and ``centreline``: planar slices coloured by Ux / U_inf.

Output is ``viz/viz.json`` (layout and metadata) plus ``viz/viz.bin`` (one little-endian
buffer of typed arrays) so the browser maps arrays without parsing numbers.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pyvista as pv
from numpy.typing import NDArray

from .binary import _Buffer, _polylines, _robust_range, _triangles, mirror_triangles
from .insights import add_insights
from .sensitivity import add_sensitivity

VIZ_VERSION = 2
CAR_GROUPS = (
    "body",
    "front_wing",
    "rear_wing",
    "wheels",
    "wheels_front",
    "wheels_rear",
    "cartridge",
    "internal",
)


def _reader(
    case: Path,
    groups: list[str],
    time_value: float | None = None,
    *,
    cell_fields: tuple[str, ...] | None = None,
) -> pv.MultiBlock:
    marker = case / "case.foam"
    marker.touch(exist_ok=True)
    r = pv.POpenFOAMReader(str(marker))
    times = [t for t in r.time_values if t > 0]
    if not times:
        raise FileNotFoundError(f"{case} has no solved time directory (run reconstruct first)")
    if time_value is not None and time_value not in times:
        raise ValueError(f"{case}: requested field time {time_value} is not available")
    r.set_active_time_value(times[-1] if time_value is None else time_value)
    r.disable_all_patch_arrays()
    r.enable_patch_array("internalMesh")
    for g in groups:
        r.enable_patch_array(f"patch/{g}")
    if cell_fields is not None:
        r.disable_all_cell_arrays()
        for name in cell_fields:
            if name in r.cell_array_names:
                r.enable_cell_array(name)
    r.cell_to_point_creation = cell_fields is None
    mesh: pv.MultiBlock = r.read()
    return mesh


def export(case: Path, out_dir: Path | None = None, n_seeds: tuple[int, int] = (16, 12)) -> Path:
    case = Path(case)
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    result_path = case / "daedalus_result.json"
    result = json.loads(result_path.read_text()) if result_path.exists() else {}
    u_inf = float(manifest["reference"]["U_m_s"])
    car = manifest["car"]
    groups = [g for g in car["groups"] if g in CAR_GROUPS]
    q = 0.5 * u_inf**2

    mesh = _reader(case, groups)
    internal = mesh["internalMesh"]
    boundary = mesh["boundary"]
    if not isinstance(internal, pv.UnstructuredGrid) or not isinstance(boundary, pv.MultiBlock):
        raise ValueError(f"{case}: unexpected OpenFOAM reader output layout")
    buf = _Buffer()
    layers: dict[str, Any] = {}

    # --- surface Cp ------------------------------------------------------------------------
    pts_all: list[NDArray[np.float64]] = []
    tris_all: list[NDArray[np.int64]] = []
    cp_all: list[NDArray[np.float64]] = []
    grp_all: list[NDArray[np.uint8]] = []
    offset = 0
    for gi, g in enumerate(groups):
        block = boundary[g]
        if block is None:
            raise ValueError(f"{case}: car patch {g!r} missing from the OpenFOAM mesh")
        patch = block.extract_surface(algorithm="dataset_surface")
        pts, tris, tri_mesh = _triangles(patch)
        cp = np.asarray(tri_mesh.point_data["p"], float) / q
        pts_all.append(pts)
        tris_all.append(tris + offset)
        cp_all.append(cp)
        grp_all.append(np.full(pts.shape[0], gi, np.uint8))
        offset += pts.shape[0]
    pts = np.vstack(pts_all)
    tris = np.vstack(tris_all)
    cp = np.concatenate(cp_all)
    grp = np.concatenate(grp_all)
    m_pts, m_tris = mirror_triangles(pts, tris)
    layers["surface"] = {
        "positions": buf.add(m_pts.astype(np.float32).ravel()),
        "indices": buf.add(m_tris.astype(np.uint32).ravel()),
        "scalar": buf.add(np.concatenate([cp, cp]).astype(np.float32)),
        "group": buf.add(np.concatenate([grp, grp])),
        "scalar_name": "Cp",
        "range": _robust_range(cp),
        "groups": groups,
    }

    # --- streamlines -----------------------------------------------------------------------
    length, width, height = car["length_m"], car["width_m"], car["height_m"]
    ny, nz = n_seeds
    ys = np.linspace(0.002, width / 2 + 0.012, ny)
    zs = np.linspace(0.0015, height + 0.012, nz)
    yy, zz = np.meshgrid(ys, zs, indexing="ij")
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
    l_pts, l_off, l_speed = _polylines(lines, u_inf)
    lp2 = np.vstack([l_pts, l_pts * np.array([1.0, -1.0, 1.0])])
    off2 = np.concatenate([l_off, l_off[1:] + l_off[-1]]) if l_off.size else l_off
    layers["streamlines"] = {
        "positions": buf.add(lp2.astype(np.float32).ravel()),
        "offsets": buf.add(off2.astype(np.uint32)),
        "scalar": buf.add(np.concatenate([l_speed, l_speed]).astype(np.float32)),
        "scalar_name": "|U|/U∞",
        "range": [0.0, float(max(1.2, np.percentile(l_speed, 99) if l_speed.size else 1.2))],
    }

    # --- slices ----------------------------------------------------------------------------
    slices: dict[str, tuple[Literal["x", "y"], tuple[float, float, float], tuple[float, ...]]] = {
        "wake": (
            "x",
            (length + 0.015, 0.0, 0.0),
            (length + 0.014, length + 0.016, 0.0, width / 2 + 0.03, 0.0, height + 0.03),
        ),
        "centreline": (
            "y",
            (0.0, 0.0006, 0.0),
            (-0.06, length + 0.12, 0.0, 0.002, 0.0, height + 0.04),
        ),
    }
    for name, (normal, origin, box) in slices.items():
        sl = internal.slice(normal=normal, origin=origin).clip_box(box, invert=False)
        s_pts, s_tris, s_mesh = _triangles(sl.extract_surface(algorithm="dataset_surface"))
        velocity = np.asarray(s_mesh.point_data["U"], float)
        ux = velocity[:, 0] / u_inf
        cp0 = (np.asarray(s_mesh.point_data["p"], float) + 0.5 * np.sum(velocity**2, axis=1)) / q
        if name == "wake":
            s_pts, s_tris = mirror_triangles(s_pts, s_tris)
            ux = np.concatenate([ux, ux])
            cp0 = np.concatenate([cp0, cp0])
        else:
            s_pts[:, 1] = 0.0  # draw exactly on the symmetry plane
        layers[name] = {
            "positions": buf.add(s_pts.astype(np.float32).ravel()),
            "indices": buf.add(s_tris.astype(np.uint32).ravel()),
            "scalar": buf.add(ux.astype(np.float32)),
            "scalars": {
                "Ux/U∞": buf.add(ux.astype(np.float32)),
                "Cp0": buf.add(cp0.astype(np.float32)),
            },
            "ranges": {"Ux/U∞": [-0.2, 1.2], "Cp0": _robust_range(cp0)},
            "scalar_name": "Ux/U∞",
            "range": [-0.2, 1.2],
        }

    out = Path(out_dir) if out_dir else case / "viz"
    out.mkdir(parents=True, exist_ok=True)
    diagnostics = add_insights(internal, boundary, manifest, result, buf, layers, out)
    adjoint = add_sensitivity(case, groups, buf, layers)
    if buf.size > 40 * 1024 * 1024:
        raise ValueError(f"flow export exceeds 40 MiB budget: {buf.size} bytes")
    (out / "viz.bin").write_bytes(b"".join(buf.chunks))
    meta = {
        "version": VIZ_VERSION,
        "diagnostics": diagnostics,
        "adjoint": adjoint,
        "U_m_s": u_inf,
        "car": {"length_m": length, "width_m": width, "height_m": height},
        "acceptance": result.get("acceptance", "pending"),
        "reasons": result.get("reasons", []),
        "iterations": result.get("iterations"),
        "bytes": buf.size,
        "layers": layers,
        "provenance": "simulated",
        "notes": [
            "Half-model fields mirrored about y = 0 for display.",
            "Cp uses kinematic p with p = 0 at the outlet; values are from the last iteration.",
            "Cp0 is total pressure relative to outlet static pressure, not a loss coefficient.",
            "Low-shear sign changes are a separation/reattachment heuristic, not physical proof.",
            "Q surfaces and oil streaks derive from the RANS snapshot and inherit its acceptance.",
            "Wall traction vector is -wallShearStress in m²/s²; its scalar magnitude is in Pa.",
        ],
    }
    (out / "viz.json").write_text(json.dumps(meta, indent=1))
    return out
