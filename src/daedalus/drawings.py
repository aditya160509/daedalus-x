"""India C2.10.6 drawing pack: source STEP projections with an explicit review register.

The generator never draws an absent component or supplies invented manufacturing notes.
Draft output is a working engineering pack, not a claim to the 60 drawing points.
"""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import typst
from build123d import Compound, ExportSVG, Location, Plane, Pos, import_step
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.gp import gp_Ax2, gp_Dir, gp_Pnt, gp_Trsf
from OCP.HLRAlgo import HLRAlgo_Projector
from OCP.HLRBRep import HLRBRep_PolyAlgo, HLRBRep_PolyHLRToShape

from daedalus import forge
from daedalus.geometry import _labelled_solids, classify

TEMPLATE = Path(__file__).parent / "report" / "drawings.typ"


@dataclass(frozen=True)
class DrawingItem:
    title: str
    selector: str
    requirement: str
    section: bool = False


ITEMS = (
    DrawingItem("Assembled car", "all", "Orthographic assembled car with regulation dimensions."),
    DrawingItem(
        "Exploded assembly", "all", "Identify every component and support in the assembly key."
    ),
    DrawingItem("Virtual cargo", "cargo", "Dimension cargo and provide a section view.", True),
    DrawingItem(
        "Official India decal", "all", "Dimension decal position from structural reference points."
    ),
    DrawingItem("Power-unit chamber", "body", "Dimension chamber depth and wall thickness.", True),
    DrawingItem("Tether guides", "tether", "Dimension guide position, attachment and aperture."),
    DrawingItem("Wheels", "wheels", "Section wheels; dimension rolling surfaces and bores.", True),
    DrawingItem(
        "Front wheels and supports", "front_wheels", "Dimension wheels, supports and axle layout."
    ),
    DrawingItem(
        "Rear wheels and supports", "rear_wheels", "Dimension wheels, supports and axle layout."
    ),
    DrawingItem("Nose cone", "nose", "Dimension the nose relative to reference plane A."),
    DrawingItem(
        "Front wing and supports",
        "front_wing",
        "Identify wing surface and boundary; dimension span/chord.",
    ),
    DrawingItem(
        "Rear wing and supports",
        "rear_wing",
        "Identify wing surface and boundary; dimension span/chord.",
    ),
    DrawingItem(
        "Intended quality and finish",
        "all",
        "Describe finish of individual parts and assembled car.",
    ),
)


def _select(
    selector: str, parts: list[tuple[str, Any]], geometry: dict[str, Any]
) -> list[tuple[str, Any]]:
    if selector == "all":
        return parts
    axle = {"front_wheels": "wheels_front", "rear_wheels": "wheels_rear"}.get(selector)
    if axle:
        labels = geometry.get("groups", {}).get(axle, [])
        frame = geometry.get("axles", {}).get(axle)
        if frame is None:
            return []
        x, radius = float(frame["origin"][0]) * 1000, float(frame["radius_m"]) * 1000
        # STEP assemblies may reuse an identical bush label at both axles.
        return [
            (label, solid)
            for label, solid in parts
            if label in labels and abs(solid.bounding_box().center().X - x) <= radius * 1.03
        ]
    if selector in ("body", "wheels", "front_wing", "rear_wing"):
        return [(label, solid) for label, solid in parts if classify(label) == selector]
    return [(label, solid) for label, solid in parts if selector in label.lower()]


def _projection(
    shape: Any, camera: tuple[int, int, int], up: tuple[int, int, int], target: Path
) -> None:
    centre = tuple(shape.bounding_box().center())
    origin = tuple(centre[i] + camera[i] * 1000 for i in range(3))
    # Polygonal hidden-line removal bounds cost on complex imported STEP faces.
    # Curves are tessellated at 0.1 mm; dimensions remain derived from CAD geometry.
    BRepMesh_IncrementalMesh(shape.wrapped, 0.1, False, 0.2, False).Perform()
    direction = gp_Dir(*camera)
    frame = gp_Ax2(gp_Pnt(*origin), direction)
    frame.SetYDirection(gp_Dir(*up))
    algorithm = HLRBRep_PolyAlgo()
    algorithm.Load(shape.wrapped)
    algorithm.Projector(HLRAlgo_Projector(frame))
    algorithm.Update()
    result = HLRBRep_PolyHLRToShape()
    result.Update(algorithm)
    visible, hidden = [], []
    for target_edges, compounds in (
        (visible, (result.VCompound(), result.OutLineVCompound())),
        (hidden, (result.HCompound(), result.OutLineHCompound())),
    ):
        for compound in compounds:
            if not compound.IsNull():
                target_edges.extend(Compound(compound).edges())
    exporter = ExportSVG(margin=2, line_weight=0.2)
    exporter.add_layer("visible", line_color=0x252525)
    exporter.add_layer("hidden", line_color=0x999999)
    exporter.add_shape(visible, layer="visible")
    exporter.add_shape(hidden, layer="hidden")
    exporter.write(target)
    if camera.count(0) == 2:  # dimension true orthographic extents, not isometric projections
        size = tuple(shape.bounding_box().size)
        right = (
            up[1] * camera[2] - up[2] * camera[1],
            up[2] * camera[0] - up[0] * camera[2],
            up[0] * camera[1] - up[1] * camera[0],
        )
        dimensions = (
            sum(abs(right[i]) * size[i] for i in range(3)),
            sum(abs(up[i]) * size[i] for i in range(3)),
        )
        _dimension_svg(target, Compound(children=[*visible, *hidden]).bounding_box(), dimensions)


def _dimension_svg(path: Path, bounds: Any, dimensions: tuple[float, float]) -> None:
    tree = ET.parse(path)  # noqa: S314 - our generated SVG, never uploaded XML
    root = tree.getroot()
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    x0, x1, y0, y1 = bounds.min.X, bounds.max.X, -bounds.max.Y, -bounds.min.Y
    font = max(2.5, (max(x1 - x0, y1 - y0)) / 20)
    pad = font * 3.5
    root.set("viewBox", f"{x0 - font} {y0 - font} {x1 - x0 + pad} {y1 - y0 + pad}")
    root.set("width", f"{x1 - x0 + pad}mm")
    root.set("height", f"{y1 - y0 + pad}mm")

    def line(a: float, b: float, c: float, d: float) -> None:
        ET.SubElement(
            root,
            "{http://www.w3.org/2000/svg}line",
            {
                "x1": str(a),
                "y1": str(b),
                "x2": str(c),
                "y2": str(d),
                "stroke": "#555",
                "stroke-width": str(font / 18),
            },
        )

    offset, tick = font, font / 4
    for x in (x0, x1):
        line(x, y1, x, y1 + offset + tick)
        line(x - tick, y1 + offset - tick, x + tick, y1 + offset + tick)
    line(x0, y1 + offset, x1, y1 + offset)
    for y in (y0, y1):
        line(x1, y, x1 + offset + tick, y)
        line(x1 + offset - tick, y - tick, x1 + offset + tick, y + tick)
    line(x1 + offset, y0, x1 + offset, y1)
    for x, y, value, vertical in (
        ((x0 + x1) / 2, y1 + 2.1 * font, dimensions[0], False),
        (x1 + 2.1 * font, (y0 + y1) / 2, dimensions[1], True),
    ):
        element = ET.SubElement(
            root,
            "{http://www.w3.org/2000/svg}text",
            {
                "x": str(x),
                "y": str(y),
                "font-size": str(font),
                "text-anchor": "middle",
                "font-family": "sans-serif",
                "fill": "#333",
            },
        )
        if vertical:
            element.set("transform", f"rotate(-90 {x} {y})")
        element.text = f"{value:.2f} mm"
    tree.write(path, encoding="unicode", xml_declaration=True)


def generate_pack(
    directory: Path,
    source: Path,
    book: Path,
    *,
    team: str,
    number: str,
    finish: str = "",
    decal: str = "",
    annotations: dict[str, str] | None = None,
) -> bytes:
    raw = (directory / "geometry.json").read_bytes()
    geometry = json.loads(raw)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if geometry["source_sha256"].removeprefix("sha256:") != source_hash:
        raise ValueError("STEP does not match the selected immutable geometry revision")
    matrix = [
        [*row, float(t) * 1000]
        for row, t in zip(
            geometry["transform"]["rotation"], geometry["transform"]["translation_m"], strict=True
        )
    ] + [[0, 0, 0, 1]]
    transform = gp_Trsf()
    transform.SetValues(*(value for row in matrix[:3] for value in row))
    parts = [
        (name, solid.moved(Location(transform)))
        for name, solid in _labelled_solids(import_step(source))
    ]
    checks = forge.check_design(directory, book)
    with tempfile.TemporaryDirectory(prefix="daedalus-drawings-") as temporary:
        root = Path(temporary)
        pages = []
        cache: dict[str, list[dict[str, str]]] = {}
        for index, item in enumerate(ITEMS, 1):
            selected = _select(item.selector, parts, geometry)
            issues = [
                "CAD only. Audit feature dimensions and tolerances before submission.",
                "Polygonal projections: 0.1 mm tessellation tolerance; audit curved details.",
            ]
            views: list[dict[str, str]] = []
            if not selected:
                issues.append(
                    f"No explicitly identified {item.selector} geometry in this STEP revision."
                )
            else:
                key = item.selector
                if index == 2:
                    key = "exploded"
                    # Explode along assembly Z, preserving the original part key and dimensions.
                    display = [
                        (name, Pos(0, 0, n * 14) * solid)
                        for n, (name, solid) in enumerate(selected)
                    ]
                else:
                    display = selected
                if key not in cache:
                    shape = Compound(children=[solid for _, solid in display])
                    cameras = [
                        ("Plan", (0, 0, 1), (1, 0, 0)),
                        ("Side", (0, -1, 0), (0, 0, 1)),
                        ("Front", (-1, 0, 0), (0, 0, 1)),
                    ]
                    if index == 2:
                        cameras = [
                            (
                                "Exploded - key bottom to top; illustrative offsets",
                                (-1, -1, 1),
                                (0, 0, 1),
                            )
                        ]
                    cache[key] = []
                    for n, (caption, camera, up) in enumerate(cameras):
                        filename = f"{key}-{n}.svg"
                        _projection(shape, camera, up, root / filename)
                        cache[key].append({"caption": caption, "file": filename})
                views = list(cache[key])
                if item.section:
                    shape = Compound(children=[solid for _, solid in selected])
                    centre_y = shape.bounding_box().center().Y
                    section = shape.intersect(Plane.XZ.offset(-centre_y))
                    if section:
                        filename = f"section-{index}.svg"
                        _projection(
                            Compound(children=list(section)), (0, -1, 0), (0, 0, 1), root / filename
                        )
                        views.append(
                            {
                                "caption": "Centre section Y = " + f"{centre_y:.2f} mm",
                                "file": filename,
                            }
                        )
                    else:
                        issues.append(
                            "No centre-section intersection; choose a section plane manually."
                        )
            review = {
                5: "Chamber depth and minimum wall thickness require local feature dimensions.",
                7: "Verify bore dimensions and uninterrupted contact surfaces on both wheels.",
                8: "Verify front axle/support attachment dimensions and bearing fits.",
                9: "Verify rear axle/support attachment dimensions and bearing fits.",
                11: "Mark the official wing surface/boundary and audit local chord/thickness.",
                12: "Mark the official wing surface/boundary and audit local chord/thickness.",
            }
            if index in review:
                issues.append(review[index])
            note = (annotations or {}).get(str(index), "")
            if index == 4:
                note = decal
                if not decal.strip():
                    issues.append("Official decal location and dimensions have not been supplied.")
            if index == 13:
                note = finish
                if not finish.strip():
                    issues.append(
                        "Intended materials, surface preparation and finish have not been supplied."
                    )
            rows = []
            labels = {label for label, _ in selected}
            for part_index, (label, solid) in enumerate(selected, 1):
                size = solid.bounding_box().size
                rows.append(
                    {
                        "label": f"{part_index}. {label}",
                        "x": f"{size.X:.2f}",
                        "y": f"{size.Y:.2f}",
                        "z": f"{size.Z:.2f}",
                    }
                )
            related = [c for c in checks if set(c.parts) & labels and c.value is not None]
            pages.append(
                {
                    "number": index,
                    "title": item.title,
                    "requirement": item.requirement,
                    "views": views,
                    "parts": rows,
                    "issues": issues,
                    "note": note,
                    "checks": [
                        f"{c.rule_id}: {c.value:.2f} {c.unit}; {c.state}; {c.note}" for c in related
                    ],
                }
            )
        data = {
            "design": directory.name,
            "team": team,
            "number": number,
            "source_hash": source_hash,
            "geometry_hash": hashlib.sha256(raw).hexdigest(),
            "pages": pages,
        }
        (root / "drawings.typ").write_text(TEMPLATE.read_text())
        return bytes(
            typst.compile(
                str(root / "drawings.typ"), root=str(root), sys_inputs={"data": json.dumps(data)}
            )
        )


def filename(number: str, team: str) -> str:
    def safe(value: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_-]+", "_", value).strip("_") or "team"

    return f"{safe(number)}_{safe(team)}_engineeringdrawings.pdf"
