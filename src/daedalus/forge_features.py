"""CAD-derived FORGE features. Samples are estimates, never proof of compliance.

Cylinder faces distinguish rolling width from chamfers. Halo measurement requires an
explicitly named notch: unrelated circular fillets must not be chosen by proximity to a limit.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from numpy.typing import NDArray
from OCP.BRepAdaptor import BRepAdaptor_Curve, BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Circle, GeomAbs_Cylinder


def analytic_features(
    solids: list[tuple[str, Any]], rotation: NDArray[np.float64], translation_m: NDArray[np.float64]
) -> dict[str, dict[str, object]]:
    """Extract per-part features in the engineering frame, millimetres."""
    out: dict[str, dict[str, object]] = {}
    for label, solid in solids:
        values: dict[str, object] = {}
        if "wheel" in label.lower():
            cylinders = []
            for face in solid.faces():
                surface = BRepAdaptor_Surface(face.wrapped, True)
                if surface.GetType() != GeomAbs_Cylinder:
                    continue
                cylinder = surface.Cylinder()
                axis = rotation @ np.asarray(cylinder.Axis().Direction().Coord())
                if abs(axis[1]) < 0.9999:
                    continue
                vertices = np.array([tuple(v.center()) for v in face.vertices()])
                if len(vertices) < 2:
                    continue
                ys = (vertices @ rotation.T)[:, 1]
                cylinders.append((float(cylinder.Radius()), float(np.ptp(ys))))
            if cylinders:
                radius = max(r for r, _ in cylinders)
                # Disjoint outer bands do not prove a continuous contact width. Conservative:
                # take the widest individual constant-radius band, never sum across grooves.
                width = max(w for r, w in cylinders if abs(r - radius) < 1e-5)
                values.update(rolling_diameter_mm=radius * 2, rolling_width_mm=width)
        if "halo" in label.lower() and "notch" in label.lower():
            centres = set()
            for edge in solid.edges():
                curve = BRepAdaptor_Curve(edge.wrapped)
                if curve.GetType() != GeomAbs_Circle:
                    continue
                sweep = curve.LastParameter() - curve.FirstParameter()
                if sweep >= 2 * math.pi - 1e-5:
                    continue
                circle = curve.Circle()
                centre = rotation @ np.array(circle.Location().Coord()) + translation_m * 1000
                centres.add(tuple(round(float(v), 5) for v in centre))
            if len(centres) == 1:
                values["notch_height_mm"] = next(iter(centres))[2]
        if values:
            out[label] = values
    return out


def wing_sections(vertices: NDArray[np.float64], faces: NDArray[np.int64]) -> dict[str, object]:
    """Vertical thickness at 21 span stations and 41 chord stations, metres → mm.

    Ray/triangle intersections avoid an optional spatial-index dependency. We retain the
    maximum thickness along each sampled chord, then the range across occupied stations.
    Supports/endplates and incidence can bias this estimate: a manual surface audit remains.
    """
    triangles = vertices[faces] * 1000
    lower, upper = vertices.min(axis=0) * 1000, vertices.max(axis=0) * 1000
    a, b, c = triangles[:, 0], triangles[:, 1], triangles[:, 2]
    e1, e2 = b - a, c - a
    determinant = e1[:, 0] * e2[:, 1] - e2[:, 0] * e1[:, 1]
    valid = np.abs(determinant) > 1e-10
    a, e1, e2, determinant = a[valid], e1[valid], e2[valid], determinant[valid]
    thickness = []
    for y in np.linspace(lower[1], upper[1], 23)[1:-1]:
        chord = []
        for x in np.linspace(lower[0], upper[0], 43)[1:-1]:
            dx, dy = x - a[:, 0], y - a[:, 1]
            u = (dx * e2[:, 1] - dy * e2[:, 0]) / determinant
            v = (e1[:, 0] * dy - e1[:, 1] * dx) / determinant
            inside = (u >= -1e-8) & (v >= -1e-8) & (u + v <= 1 + 1e-8)
            zs = np.unique(np.round((a[:, 2] + u * e1[:, 2] + v * e2[:, 2])[inside], 7))
            if len(zs) >= 2 and len(zs) % 2 == 0:
                chord.append(float(np.max(zs[1::2] - zs[::2])))
        if chord:
            thickness.append(max(chord))
    if not thickness:
        return {}
    return {
        "thickness_min_mm": min(thickness),
        "thickness_max_mm": max(thickness),
        "sampled_stations": len(thickness),
        "method": "sampled vertical sections; manual audit required",
    }


def measure_design(design_dir: Any, source: Any) -> dict[str, dict[str, object]]:
    """Re-measure an existing immutable revision into a hash-bound derived sidecar."""
    import hashlib
    import json

    from build123d import import_step

    from daedalus.geometry import _labelled_solids, _tessellate, classify

    geometry_bytes = (design_dir / "geometry.json").read_bytes()
    geometry = json.loads(geometry_bytes)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != geometry["source_sha256"].removeprefix("sha256:"):
        raise ValueError("STEP source hash differs from this geometry revision")
    frame = geometry["transform"]
    rotation = np.asarray(frame["rotation"], dtype=np.float64)
    shift = np.asarray(frame["translation_m"], dtype=np.float64)
    if frame["source_units"] != "mm" or frame["scale_to_m"] != 0.001:
        raise ValueError("FORGE features require the recorded millimetre source frame")
    solids = _labelled_solids(import_step(source))
    features = analytic_features(solids, rotation, shift)
    for label, solid in solids:
        if classify(label) in ("front_wing", "rear_wing"):
            mesh = _tessellate(solid, 0.05)
            vertices = (mesh.vertices @ rotation.T) * 0.001 + shift
            features.setdefault(label, {}).update(wing_sections(vertices, mesh.faces))
    payload = {
        "version": 1,
        "geometry_sha256": hashlib.sha256(geometry_bytes).hexdigest(),
        "source_sha256": geometry["source_sha256"],
        "features": features,
    }
    import tempfile
    from pathlib import Path

    # Unique temporary file + atomic replacement; readers never see half-written JSON.
    with tempfile.NamedTemporaryFile(mode="w", dir=design_dir, delete=False) as handle:
        temporary = Path(handle.name)
        json.dump(payload, handle)
    temporary.replace(design_dir / "forge-features.json")
    return features
