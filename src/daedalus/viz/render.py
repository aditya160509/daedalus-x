"""Photo-style hero renders of a solved case (PyVista/VTK, offscreen, server side).

Browsers cannot ray trace a CFD scene live, so commercial tools ship pre-rendered stills.
We do the same: PBR car coloured by Cp, speed-coloured streamtubes, soft shadows, SSAA.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pyvista as pv

from . import CAR_GROUPS, _reader

VIEWS = {
    "iso": ((-0.16, -0.21, 0.13), (0.11, 0.0, 0.02)),
    "side": ((0.11, -0.42, 0.03), (0.11, 0.0, 0.02)),
    "top": ((0.11, 0.0, 0.42), (0.11, 0.0, 0.0)),
    "front": ((-0.35, -0.06, 0.06), (0.11, 0.0, 0.02)),
}


def render(case: Path, out: Path, view: str = "iso", size: tuple[int, int] = (2400, 1350)) -> Path:
    case = Path(case)
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    u_inf = float(manifest["reference"]["U_m_s"])
    car = manifest["car"]
    groups = [g for g in car["groups"] if g in CAR_GROUPS]
    mesh = _reader(case, groups)
    internal, boundary = mesh["internalMesh"], mesh["boundary"]
    q = 0.5 * u_inf**2

    parts = []
    for g in groups:
        s = boundary[g].extract_surface(algorithm="dataset_surface").triangulate()
        s.point_data["Cp"] = np.asarray(s.point_data["p"], float) / q
        parts.append(s)
    half = pv.merge(parts)
    body = half.merge(half.reflect((0, 1, 0), point=(0, 0, 0))).compute_normals(
        auto_orient_normals=True
    )

    w, h = car["width_m"], car["height_m"]
    yy, zz = np.meshgrid(
        np.linspace(0.003, w / 2 + 0.004, 7), np.linspace(0.003, h + 0.004, 5), indexing="ij"
    )
    seeds = pv.PolyData(np.column_stack([np.full(yy.size, -0.03), yy.ravel(), zz.ravel()]))
    lines = internal.streamlines_from_source(
        seeds,
        vectors="U",
        max_length=car["length_m"] * 1.8,
        initial_step_length=0.2,
        step_unit="cl",
        max_steps=4000,
    )
    lines.point_data["speed"] = np.linalg.norm(lines.point_data["U"], axis=1) / u_inf
    lines = lines.merge(lines.reflect((0, 1, 0), point=(0, 0, 0)))
    tubes = lines.tube(radius=0.00022, n_sides=10)

    pl = pv.Plotter(off_screen=True, window_size=list(size))
    pl.set_background("#0b0c0f", top="#1a1d24")
    car_actor = pl.add_mesh(
        body,
        scalars="Cp",
        cmap="RdYlBu_r",
        clim=(-1.0, 1.0),
        pbr=True,
        metallic=0.25,
        roughness=0.35,
        smooth_shading=True,
        show_scalar_bar=False,
    )
    flow_actor = pl.add_mesh(
        tubes,
        scalars="speed",
        cmap="turbo",
        clim=(0.2, 1.25),
        smooth_shading=True,
        show_scalar_bar=False,
        ambient=0.25,
    )
    floor = pv.Plane(center=(0.11, 0, -0.0005), direction=(0, 0, 1), i_size=0.9, j_size=0.6)
    pl.add_mesh(floor, color="#15171c", pbr=True, roughness=0.18, metallic=0.0)
    pl.add_scalar_bar(
        "Cp",
        mapper=car_actor.mapper,
        vertical=True,
        position_x=0.92,
        position_y=0.25,
        height=0.5,
        width=0.025,
        color="#cfd2d8",
        title_font_size=22,
        label_font_size=18,
    )
    pl.add_scalar_bar(
        "U/U∞",
        mapper=flow_actor.mapper,
        vertical=True,
        position_x=0.85,
        position_y=0.25,
        height=0.5,
        width=0.025,
        color="#cfd2d8",
        title_font_size=22,
        label_font_size=18,
    )
    pl.add_light(pv.Light(position=(-0.3, -0.4, 0.6), focal_point=(0.11, 0, 0), intensity=0.9))
    pl.enable_shadows()
    pl.enable_ssao(radius=0.004)
    pl.enable_anti_aliasing("ssaa")
    pos, focal = VIEWS[view]
    pl.camera_position = [pos, focal, (0, 0, 1)]
    pl.camera.view_angle = 28
    out.parent.mkdir(parents=True, exist_ok=True)
    pl.screenshot(str(out))
    pl.close()
    return out
