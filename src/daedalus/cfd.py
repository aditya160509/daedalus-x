"""AETHER CFD pipeline: case generation, execution and force extraction (spec §4.1a, §4.2b, §4.4a).

One versioned template (TEMPLATE_VERSION) defines the domain, numerics, boundary conditions and
force function objects. Inputs are the per-group STL surfaces written by `geometry.import_car`
(engineering frame, metres). The case is a half model with a symmetry plane at y = 0, a moving
ground and rotating wheels when axle metadata is available. Assumptions are in the manifest.
"""

from __future__ import annotations

import json
import math
import platform
import shutil
import subprocess
import time
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

import numpy as np

if TYPE_CHECKING:
    from daedalus.geometry import Axle

AcceptanceMode = Literal["steady", "averaged"]
CD_AVERAGING_WINDOW = 500
CD_BATCHES = 10

TEMPLATE_VERSION = "daedalus-halfcar-v4"
OPENFOAM_LAUNCHER = "openfoam"  # OpenFOAM.app wrapper: `openfoam -c "<command>"`

HEADER = """/*--------------------------------*- C++ -*----------------------------------*\\
  Daedalus X generated case ({template}) - do not edit by hand
\\*---------------------------------------------------------------------------*/
FoamFile
{{
    version     2.0;
    format      ascii;
    class       {cls};
    object      {obj};
}}
"""

ASSUMPTIONS = (
    "half model, symmetryPlane at y = 0 (zero yaw)",
    "steady incompressible RANS, k-omega SST, Spalding wall function",
    "moving ground at freestream speed",
    "ground plane raised 0.5 mm into the wheels to avoid zero-thickness contact cells",
    "uniform inlet, turbulence intensity 0.5 %, length scale 10 mm",
)


@dataclass(frozen=True)
class CaseConfig:
    speed_m_s: float = 20.0
    nu_m2_s: float = 1.5e-5
    rho_kg_m3: float = 1.204
    base_cell_m: float = 0.02
    domain_cell_m: float | None = None
    surface_level: tuple[int, int] = (4, 5)
    wing_level: tuple[int, int] = (5, 5)
    near_box_level: int = 3
    wake_box_level: int = 2
    n_layers: int = 3
    max_iterations: int = 1500
    n_procs: int = 6
    turbulence_intensity: float = 0.005
    turbulence_length_m: float = 0.01
    ground_offset_m: float = 0.0005
    # Stop early once the windowed Cd average moves less than this (relative). None = run to end.
    early_stop_tolerance: float | None = 0.001
    early_stop_window: int = 200
    acceptance_mode: AcceptanceMode | None = None

    def __post_init__(self) -> None:
        if not (0 < self.speed_m_s < 100):
            raise ValueError("speed must be in (0, 100) m/s")
        if self.base_cell_m <= 0 or not math.isfinite(self.base_cell_m):
            raise ValueError("base_cell_m must be finite and positive")
        if self.domain_cell_m is not None and (
            self.domain_cell_m <= 0 or not math.isfinite(self.domain_cell_m)
        ):
            raise ValueError("domain_cell_m must be finite and positive")
        if self.n_procs < 1 or self.max_iterations < 50:
            raise ValueError("n_procs >= 1 and max_iterations >= 50 required")
        if self.acceptance_mode not in (None, "steady", "averaged"):
            raise ValueError("acceptance_mode must be steady or averaged")
        if self.early_stop_window < 20:
            raise ValueError("early_stop_window must be >= 20")
        if self.early_stop_tolerance is not None and not (0 < self.early_stop_tolerance < 0.1):
            raise ValueError("early_stop_tolerance must be in (0, 0.1)")

    @classmethod
    def preset(cls, fidelity: str, **overrides: Any) -> CaseConfig:
        if fidelity not in FIDELITY:
            raise ValueError(f"unknown fidelity {fidelity!r}; choose from {sorted(FIDELITY)}")
        return cls(**{**FIDELITY[fidelity], **overrides})


# Mesh/iteration presets. "quick" is ~3x fewer cells for screening design changes; every
# reported number must come from "final" (and, for acceptance, a grid study).
FIDELITY: dict[str, dict[str, Any]] = {
    "quick": {
        "base_cell_m": 0.03,
        "surface_level": (3, 4),
        "wing_level": (4, 4),
        "near_box_level": 2,
        "wake_box_level": 1,
        "n_layers": 2,
        "max_iterations": 1200,
        "early_stop_window": 150,
    },
    "final": {},
}


@dataclass(frozen=True)
class CarGeometry:
    """Facts from geometry.json needed to build the case."""

    length_m: float
    width_m: float
    height_m: float
    frontal_area_m2: float
    groups: tuple[str, ...]
    axles: dict[str, Axle] = field(default_factory=dict)

    @classmethod
    def from_design_dir(cls, design_dir: Path) -> CarGeometry:
        g = json.loads((design_dir / "geometry.json").read_text())
        stls = tuple(sorted(p.stem for p in (design_dir / "cfd").glob("*.stl")))
        if not stls:
            raise FileNotFoundError(f"no CFD surfaces in {design_dir / 'cfd'}")
        axles: dict[str, Axle] = g.get("axles", {})
        for name, axle in axles.items():
            if name not in ("wheels_front", "wheels_rear") or name not in stls:
                raise ValueError(f"invalid axle surface {name!r}")
            axis = np.asarray(axle["axis"], dtype=float)
            origin = np.asarray(axle["origin"], dtype=float)
            if axis.shape != (3,) or origin.shape != (3,):
                raise ValueError(f"{name}: axle axis and origin must have three coordinates")
            radius = axle["radius_m"]
            if not math.isfinite(radius) or radius <= 0:
                raise ValueError(f"{name}: wheel radius must be finite and positive")
            if (
                not np.allclose(axis, [0, 1, 0])
                or not np.all(np.isfinite(origin))
                or not np.allclose(origin[1:], [0, radius])
            ):
                raise ValueError(f"{name}: axle must use axis (0 1 0) and origin (x 0 radius)")
        return cls(g["length_m"], g["width_m"], g["height_m"], g["frontal_area_m2"], stls, axles)


@dataclass(frozen=True)
class Domain:
    xmin: float
    xmax: float
    ymax: float
    zmin: float
    zmax: float

    @classmethod
    def around(cls, car: CarGeometry, cfg: CaseConfig) -> Domain:
        L = car.length_m
        snap = cfg.domain_cell_m or cfg.base_cell_m

        def r(v: float) -> float:
            return round(v / snap) * snap

        return cls(
            xmin=r(-2.5 * L),
            xmax=r(7.5 * L),
            ymax=r(max(4 * car.width_m, 0.3)),
            zmin=cfg.ground_offset_m,
            zmax=r(max(6 * car.height_m, 0.3)),
        )

    def cells(self, base: float) -> tuple[int, int, int]:
        return (
            max(1, round((self.xmax - self.xmin) / base)),
            max(1, round(self.ymax / base)),
            max(1, round((self.zmax - self.zmin) / base)),
        )


def _v(x: float) -> str:
    return f"{x:.6g}"


def write_case(case_dir: Path, design_dir: Path, cfg: CaseConfig) -> dict[str, object]:
    """Create a complete OpenFOAM case directory. Returns the case manifest."""
    car = CarGeometry.from_design_dir(design_dir)
    mode: AcceptanceMode = cfg.acceptance_mode or (
        "averaged" if any(g.startswith("wheels") for g in car.groups) else "steady"
    )
    cfg = replace(cfg, acceptance_mode=mode)
    dom = Domain.around(car, cfg)
    if case_dir.exists():
        raise FileExistsError(f"{case_dir} already exists; cases are never overwritten")
    for sub in ("0", "constant/triSurface", "system"):
        (case_dir / sub).mkdir(parents=True)
    for g in car.groups:
        shutil.copyfile(
            design_dir / "cfd" / f"{g}.stl", case_dir / "constant/triSurface" / f"{g}.stl"
        )

    # +y crossed with -z is -x: negative omega matches downstream moving ground.
    U = cfg.speed_m_s
    k = 1.5 * (U * cfg.turbulence_intensity) ** 2
    omega = math.sqrt(k) / (0.09**0.25 * cfg.turbulence_length_m)
    aref_half = car.frontal_area_m2 / 2.0
    files = {
        "system/controlDict": _control_dict(cfg, car, aref_half),
        "system/fvSchemes": _FV_SCHEMES,
        "system/fvSolution": (
            _FV_SOLUTION.replace('    residualControl { p 1e-4; U 1e-5; "(k|omega)" 1e-5; }', "")
            if mode == "averaged"
            else _FV_SOLUTION
        ),
        "system/blockMeshDict": _block_mesh(dom, cfg),
        "system/snappyHexMeshDict": _snappy(car, dom, cfg),
        "system/meshQualityDict": _MESH_QUALITY,
        "system/surfaceFeatureExtractDict": _surface_features(car),
        "system/decomposeParDict": _decompose(cfg),
        "constant/transportProperties": _dict("transportProperties")
        + f"transportModel  Newtonian;\nnu              {_v(cfg.nu_m2_s)};\n",
        "constant/turbulenceProperties": _dict("turbulenceProperties")
        + "simulationType RAS;\nRAS\n{\n    RASModel kOmegaSST;\n"
        + "    turbulence on;\n    printCoeffs on;\n}\n",
        "0/U": _field(
            "volVectorField",
            "U",
            "[0 1 -1 0 0 0 0]",
            f"uniform ({_v(U)} 0 0)",
            car,
            {
                "inlet": f"type fixedValue; value uniform ({_v(U)} 0 0);",
                "outlet": "type inletOutlet; inletValue uniform (0 0 0); value $internalField;",
                "ground": f"type fixedValue; value uniform ({_v(U)} 0 0);",
                "_car": "type noSlip;",
                **{
                    group: (
                        "type rotatingWallVelocity; origin ("
                        + " ".join(_v(v) for v in axle["origin"])
                        + f"); axis (0 1 0); omega {_v(-U / axle['radius_m'])}; "
                        "value $internalField;"
                    )
                    for group, axle in car.axles.items()
                },
            },
        ),
        "0/p": _field(
            "volScalarField",
            "p",
            "[0 2 -2 0 0 0 0]",
            "uniform 0",
            car,
            {
                "inlet": "type zeroGradient;",
                "outlet": "type fixedValue; value uniform 0;",
                "ground": "type zeroGradient;",
                "_car": "type zeroGradient;",
            },
        ),
        "0/k": _field(
            "volScalarField",
            "k",
            "[0 2 -2 0 0 0 0]",
            f"uniform {_v(k)}",
            car,
            {
                "inlet": "type fixedValue; value $internalField;",
                "outlet": "type inletOutlet; inletValue $internalField; value $internalField;",
                "ground": "type kqRWallFunction; value $internalField;",
                "_car": "type kqRWallFunction; value $internalField;",
            },
        ),
        "0/omega": _field(
            "volScalarField",
            "omega",
            "[0 0 -1 0 0 0 0]",
            f"uniform {_v(omega)}",
            car,
            {
                "inlet": "type fixedValue; value $internalField;",
                "outlet": "type inletOutlet; inletValue $internalField; value $internalField;",
                "ground": "type omegaWallFunction; value $internalField;",
                "_car": "type omegaWallFunction; value $internalField;",
            },
        ),
        "0/nut": _field(
            "volScalarField",
            "nut",
            "[0 2 -1 0 0 0 0]",
            "uniform 0",
            car,
            {
                "inlet": "type calculated; value uniform 0;",
                "outlet": "type calculated; value uniform 0;",
                "ground": "type nutUSpaldingWallFunction; value uniform 0;",
                "_car": "type nutUSpaldingWallFunction; value uniform 0;",
            },
        ),
    }
    for rel, text in files.items():
        (case_dir / rel).write_text(text)

    manifest: dict[str, object] = {
        "template": TEMPLATE_VERSION,
        "config": asdict(cfg),
        "car": asdict(car),
        "domain": asdict(dom),
        "base_cells": dom.cells(cfg.base_cell_m),
        "reference": {
            "U_m_s": U,
            "lRef_m": car.length_m,
            "Aref_full_m2": car.frontal_area_m2,
            "Aref_half_m2": aref_half,
        },
        "inlet_turbulence": {"k_m2_s2": k, "omega_1_s": omega},
        "assumptions": [
            *ASSUMPTIONS,
            *(
                [
                    "wheels rotate with ω = U/r (no slip at contact); "
                    "contact patch modelled by 0.5 mm ground offset"
                ]
                if car.axles
                else []
            ),
            *(
                [
                    "averaged gate estimates numerical iteration-mean uncertainty; "
                    "steady RANS iterations are not physical time samples"
                ]
                if mode == "averaged"
                else []
            ),
        ],
        "warnings": [
            f"{g}: no axle metadata; falling back to stationary noSlip wheels"
            for g in car.groups
            if g.startswith("wheels") and g not in car.axles
        ],
    }
    (case_dir / "daedalus_manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def _dict(obj: str, cls: str = "dictionary") -> str:
    return HEADER.format(template=TEMPLATE_VERSION, cls=cls, obj=obj)


def _field(
    cls: str, name: str, dims: str, internal: str, car: CarGeometry, bc: dict[str, str]
) -> str:
    patches = {
        **{k: v for k, v in bc.items() if k != "_car"},
        "symmetry": "type symmetryPlane;",
        "top": "type slip;" if name in ("U", "p") else "type zeroGradient;",
        "side": "type slip;" if name in ("U", "p") else "type zeroGradient;",
    }
    if name == "p":
        patches["top"] = patches["side"] = "type zeroGradient;"
    body = '    #includeEtc "caseDicts/setConstraintTypes"\n'
    body += "".join(f"    {p}\n    {{\n        {s}\n    }}\n" for p, s in patches.items())
    walls = [g for g in car.groups if g not in patches]
    if walls:
        body += f'    "({"|".join(walls)})"\n    {{\n        {bc["_car"]}\n    }}\n'
    return (
        _dict(name, cls)
        + f"dimensions {dims};\ninternalField {internal};\nboundaryField\n{{\n{body}}}\n"
    )


def _block_mesh(d: Domain, cfg: CaseConfig) -> str:
    nx, ny, nz = d.cells(cfg.base_cell_m)
    x0, x1, y1, z0, z1 = map(_v, (d.xmin, d.xmax, d.ymax, d.zmin, d.zmax))
    return (
        _dict("blockMeshDict")
        + f"""scale 1;
vertices
(
    ({x0} 0 {z0}) ({x1} 0 {z0}) ({x1} {y1} {z0}) ({x0} {y1} {z0})
    ({x0} 0 {z1}) ({x1} 0 {z1}) ({x1} {y1} {z1}) ({x0} {y1} {z1})
);
blocks ( hex (0 1 2 3 4 5 6 7) ({nx} {ny} {nz}) simpleGrading (1 1 1) );
boundary
(
    inlet    {{ type patch;         faces ((0 4 7 3)); }}
    outlet   {{ type patch;         faces ((1 2 6 5)); }}
    ground   {{ type wall;          faces ((0 3 2 1)); }}
    top      {{ type patch;         faces ((4 5 6 7)); }}
    side     {{ type patch;         faces ((3 7 6 2)); }}
    symmetry {{ type symmetryPlane; faces ((0 1 5 4)); }}
);
"""
    )


def _snappy(car: CarGeometry, d: Domain, cfg: CaseConfig) -> str:
    L, W, H = car.length_m, car.width_m, car.height_m
    geom = "".join(f'    {g} {{ type triSurfaceMesh; file "{g}.stl"; }}\n' for g in car.groups)
    near = f"min ({_v(-0.15 * L)} 0 0); max ({_v(1.5 * L)} {_v(0.8 * W)} {_v(1.6 * H)});"
    wake = f"min ({_v(-0.4 * L)} 0 0); max ({_v(4.0 * L)} {_v(1.4 * W)} {_v(2.6 * H)});"
    features = "".join(
        f'        {{ file "{g}.eMesh"; level {cfg.surface_level[1]}; }}\n' for g in car.groups
    )
    surf = ""
    for g in car.groups:
        lv = cfg.wing_level if "wing" in g else cfg.surface_level
        surf += f"        {g} {{ level ({lv[0]} {lv[1]}); patchInfo {{ type wall; }} }}\n"
    layers = "".join(f"        {g} {{ nSurfaceLayers {cfg.n_layers}; }}\n" for g in car.groups)
    inside = f"({_v(d.xmax - 2 * cfg.base_cell_m)} {_v(d.ymax / 2)} {_v(d.zmax / 2)})"
    return (
        _dict("snappyHexMeshDict")
        + f"""castellatedMesh true;
snap            true;
addLayers       {"true" if cfg.n_layers > 0 else "false"};

geometry
{{
{geom}    nearBox {{ type searchableBox; {near} }}
    wakeBox {{ type searchableBox; {wake} }}
}}

castellatedMeshControls
{{
    maxLocalCells 2000000;
    maxGlobalCells 8000000;
    minRefinementCells 10;
    maxLoadUnbalance 0.10;
    nCellsBetweenLevels 3;
    features
    (
{features}    );
    refinementSurfaces
    {{
{surf}    }}
    resolveFeatureAngle 30;
    refinementRegions
    {{
        nearBox {{ mode inside; levels ((1e15 {cfg.near_box_level})); }}
        wakeBox {{ mode inside; levels ((1e15 {cfg.wake_box_level})); }}
    }}
    locationInMesh {inside};
    allowFreeStandingZoneFaces true;
}}

snapControls
{{
    nSmoothPatch 5;
    tolerance 2.0;
    nSolveIter 50;
    nRelaxIter 8;
    nFeatureSnapIter 15;
    implicitFeatureSnap false;
    explicitFeatureSnap true;
    multiRegionFeatureSnap false;
}}

addLayersControls
{{
    relativeSizes true;
    layers
    {{
{layers}    }}
    expansionRatio 1.2;
    finalLayerThickness 0.5;
    minThickness 0.1;
    nGrow 0;
    featureAngle 130;
    slipFeatureAngle 30;
    nRelaxIter 3;
    nSmoothSurfaceNormals 1;
    nSmoothNormals 3;
    nSmoothThickness 10;
    maxFaceThicknessRatio 0.5;
    maxThicknessToMedialRatio 0.3;
    minMedialAxisAngle 90;
    nBufferCellsNoExtrude 0;
    nLayerIter 50;
}}

meshQualityControls
{{
    #include "meshQualityDict"
}}

mergeTolerance 1e-6;
"""
    )


def _surface_features(car: CarGeometry) -> str:
    return _dict("surfaceFeatureExtractDict") + "".join(
        f"{g}.stl\n{{\n    extractionMethod extractFromSurface;\n    includedAngle 150;\n"
        "    subsetFeatures { nonManifoldEdges no; openEdges yes; }\n    writeObj no;\n}\n"
        for g in car.groups
    )


def _decompose(cfg: CaseConfig) -> str:
    return _dict("decomposeParDict") + f"numberOfSubdomains {cfg.n_procs};\nmethod scotch;\n"


def _control_dict(cfg: CaseConfig, car: CarGeometry, aref_half: float) -> str:
    groups = " ".join(car.groups)
    common = (
        f"        rho rhoInf; rhoInf {_v(cfg.rho_kg_m3)};\n"
        "        CofR (0 0 0);\n"
        "        writeControl timeStep; writeInterval 1;\n"
    )
    force_groups = {g: g for g in car.groups if g not in ("wheels_front", "wheels_rear")}
    wheels = [g for g in car.groups if g in ("wheels_front", "wheels_rear")]
    if wheels:
        force_groups["wheels"] = " ".join(wheels)
    per_group = "".join(
        f"    forces_{g}\n    {{\n        type forces; libs (forces);\n"
        f"        patches ({patches});\n{common}    }}\n"
        for g, patches in force_groups.items()
    )
    minimum_duration = (
        f"            minimumIterations\n            {{\n"
        f"                type maxDuration; duration {2 * CD_AVERAGING_WINDOW}; groupID 1;\n"
        "            }\n"
        if cfg.acceptance_mode == "averaged"
        else ""
    )
    early_stop = (
        ""
        if cfg.early_stop_tolerance is None
        else f"""    earlyStop
    {{
        type runTimeControl; libs (utilityFunctionObjects);
        conditions
        {{
            cdSteady
            {{
                type average; functionObject forceCoeffs; fields (Cd);
                tolerance {_v(cfg.early_stop_tolerance)};
                window {cfg.early_stop_window}; windowType approximate; groupID 1;
            }}
{minimum_duration}        }}
        satisfiedAction end;
    }}
"""
    )
    return (
        _dict("controlDict")
        + f"""application     simpleFoam;
startFrom       latestTime;
startTime       0;
stopAt          endTime;
endTime         {cfg.max_iterations};
deltaT          1;
writeControl    timeStep;
writeInterval   {cfg.max_iterations};
purgeWrite      1;
writeFormat     binary;
writePrecision  8;
writeCompression off;
timeFormat      general;
timePrecision   6;
runTimeModifiable false;

functions
{{
    forceCoeffs
    {{
        type forceCoeffs; libs (forces);
        patches ({groups});
{common}        coefficients (Cd Cl Cs);
        magUInf {_v(cfg.speed_m_s)};
        lRef {_v(car.length_m)};
        Aref {_v(aref_half)};
        dragDir (1 0 0); liftDir (0 0 1); pitchAxis (0 1 0);
    }}
{per_group}    wallShearStress
    {{
        type wallShearStress; libs (fieldFunctionObjects);
        patches ({groups});
        writeControl writeTime;
    }}
    yPlus
    {{
        type yPlus; libs (fieldFunctionObjects);
        writeControl writeTime;
    }}
    residuals
    {{
        type solverInfo; libs (utilityFunctionObjects);
        fields (U p k omega);
        writeControl timeStep; writeInterval 1;
    }}
{early_stop}}}
"""
    )


_FV_SCHEMES = (
    HEADER.format(template=TEMPLATE_VERSION, cls="dictionary", obj="fvSchemes")
    + """ddtSchemes { default steadyState; }
gradSchemes { default Gauss linear; grad(U) cellLimited Gauss linear 1; }
divSchemes
{
    default none;
    div(phi,U) bounded Gauss linearUpwindV grad(U);
    div(phi,k) bounded Gauss upwind;
    div(phi,omega) bounded Gauss upwind;
    div((nuEff*dev2(T(grad(U))))) Gauss linear;
}
laplacianSchemes { default Gauss linear limited corrected 0.5; }
interpolationSchemes { default linear; }
snGradSchemes { default limited corrected 0.5; }
wallDist { method meshWave; }
"""
)

_FV_SOLUTION = (
    HEADER.format(template=TEMPLATE_VERSION, cls="dictionary", obj="fvSolution")
    + """solvers
{
    p { solver GAMG; smoother GaussSeidel; tolerance 1e-7; relTol 0.01; }
    Phi { $p; }
    "(U|k|omega)"
    {
        solver smoothSolver; smoother GaussSeidel; tolerance 1e-8; relTol 0.1; nSweeps 1;
    }
}
SIMPLE
{
    nNonOrthogonalCorrectors 1;
    consistent yes;
    residualControl { p 1e-4; U 1e-5; "(k|omega)" 1e-5; }
}
potentialFlow { nNonOrthogonalCorrectors 10; }
relaxationFactors { equations { U 0.9; k 0.7; omega 0.7; } }
cache { grad(U); }
"""
)

_MESH_QUALITY = (
    HEADER.format(template=TEMPLATE_VERSION, cls="dictionary", obj="meshQualityDict")
    + """maxNonOrtho 65;
maxBoundarySkewness 20;
maxInternalSkewness 4;
maxConcave 80;
minVol 1e-13;
minTetQuality 1e-15;
minArea -1;
minTwist 0.02;
minDeterminant 0.001;
minFaceWeight 0.05;
minVolRatio 0.01;
minTriangleTwist -1;
nSmoothScale 4;
errorReduction 0.75;
"""
)


# --- execution -----------------------------------------------------------------------------


class CfdError(Exception):
    pass


@dataclass
class StepLog:
    name: str
    command: str
    seconds: float
    returncode: int
    log_file: str


@dataclass
class RunResult:
    case_dir: str
    succeeded: bool
    steps: list[StepLog] = field(default_factory=list)
    cells: int | None = None
    mesh_ok: bool | None = None
    mesh_failures: list[str] = field(default_factory=list)
    iterations: int | None = None
    converged_by_residuals: bool | None = None
    cd: float | None = None
    cl: float | None = None
    cd_window_spread: float | None = None
    cd_mean: float | None = None
    cd_ci95: tuple[float, float] | None = None
    acceptance_mode: AcceptanceMode = "steady"
    forces_n: dict[str, dict[str, float]] = field(default_factory=dict)
    force_sum_check: dict[str, float] = field(default_factory=dict)
    acceptance: str = "pending_review"
    reasons: list[str] = field(default_factory=list)
    host: dict[str, str] = field(default_factory=dict)


def _run(case_dir: Path, name: str, command: str, steps: list[StepLog]) -> None:
    log = case_dir / f"log.{name}"
    t0 = time.monotonic()
    with log.open("w") as fh:
        proc = subprocess.run(
            [OPENFOAM_LAUNCHER, "-c", command], cwd=case_dir, stdout=fh, stderr=subprocess.STDOUT
        )
    steps.append(StepLog(name, command, round(time.monotonic() - t0, 2), proc.returncode, log.name))
    if proc.returncode != 0:
        raise CfdError(f"{name} failed (exit {proc.returncode}); see {log}")


def run_case(case_dir: Path, n_procs: int, resume_from: str | None = None) -> RunResult:
    """Mesh, solve and post-process. Never raises for solver failure: returns a failed result."""
    if shutil.which(OPENFOAM_LAUNCHER) is None:
        raise CfdError("OpenFOAM launcher not found; install OpenFOAM.app")
    mode = json.loads((case_dir / "daedalus_manifest.json").read_text())["config"].get(
        "acceptance_mode", "steady"
    )
    if mode not in ("steady", "averaged"):
        raise CfdError(f"invalid acceptance mode {mode!r}")
    res = RunResult(
        case_dir=str(case_dir), succeeded=False, host=_host_info(), acceptance_mode=mode
    )
    par = f"mpirun -np {n_procs}" if n_procs > 1 else ""
    pflag = "-parallel" if n_procs > 1 else ""
    steps = [
        ("surfaceFeatureExtract", "surfaceFeatureExtract"),
        ("blockMesh", "blockMesh"),
        ("decomposePar", "decomposePar -force" if n_procs > 1 else "true"),
        ("snappyHexMesh", f"{par} snappyHexMesh -overwrite {pflag}"),
        ("checkMesh", f"{par} checkMesh -latestTime {pflag}"),
        (
            "restore0",
            "for d in processor*; do rm -rf $d/0; cp -r 0 $d/0; done" if n_procs > 1 else "true",
        ),
        ("potentialFoam", f"{par} potentialFoam -writephi {pflag}"),
        ("simpleFoam", f"{par} simpleFoam {pflag}"),
        (
            "reconstruct",
            "reconstructParMesh -constant && reconstructPar -latestTime" if n_procs > 1 else "true",
        ),
    ]
    names = [n for n, _ in steps]
    if resume_from is not None and resume_from not in names:
        raise CfdError(f"unknown step {resume_from!r}; choose from {names}")
    start = names.index(resume_from) if resume_from else 0
    try:
        for name, cmd in steps[start:]:
            if name == "restore0":
                _restore_initial_fields(case_dir, res.steps)
            else:
                _run(case_dir, name, cmd, res.steps)
                if name == "checkMesh":
                    _mesh_status(case_dir, res)
                    if not res.mesh_ok:
                        raise CfdError("checkMesh rejected mesh: " + "; ".join(res.mesh_failures))
    except CfdError as e:
        _mesh_status(case_dir, res)
        res.reasons.append(str(e))
        res.acceptance = "rejected"
        _write_result(case_dir, res)
        return res
    res.succeeded = True
    evaluate(case_dir, res)
    _write_result(case_dir, res)
    return res


def _restore_initial_fields(case_dir: Path, steps: list[StepLog]) -> None:
    """Copy pristine 0/ fields into each processor directory after snappyHexMesh.

    The fields use regex patch names plus setConstraintTypes, so the same files are valid for
    every subdomain. Done in Python: no shell loop through the OpenFOAM wrapper.
    """
    t0 = time.monotonic()
    procs = sorted(case_dir.glob("processor*"))
    for p in procs:
        shutil.rmtree(p / "0", ignore_errors=True)
        shutil.copytree(case_dir / "0", p / "0")
    steps.append(
        StepLog(
            "restore0",
            f"copy 0/ -> {len(procs)} processor dirs",
            round(time.monotonic() - t0, 2),
            0,
            "",
        )
    )


def _host_info() -> dict[str, str]:
    return {
        "os": platform.platform(),
        "machine": platform.machine(),
        "python": platform.python_version(),
    }


def _write_result(case_dir: Path, res: RunResult) -> None:
    (case_dir / "daedalus_result.json").write_text(json.dumps(asdict(res), indent=2))


# --- post-processing and quality gates ----------------------------------------------------


def read_dat(path: Path) -> tuple[list[str], np.ndarray]:
    """Read an OpenFOAM function-object .dat file. Returns (column names, data array)."""
    names: list[str] = []
    rows: list[list[float]] = []
    for line in path.read_text().splitlines():
        if line.startswith("#"):
            parts = line[1:].replace("(", " ").replace(")", " ").split()
            if parts and parts[0] == "Time":
                names = parts
            continue
        vals = line.replace("(", " ").replace(")", " ").split()
        if vals:
            rows.append([_to_float(v) for v in vals])
    if not rows:
        raise CfdError(f"{path} has no data")
    return names, np.asarray(rows)


def _to_float(token: str) -> float:
    """Numeric columns parse as floats; text columns (solver names, flags) become NaN."""
    try:
        return float(token)
    except ValueError:
        return float("nan")


CD_STABILITY_WINDOW = 200
CD_STABILITY_TOL = 0.01  # max relative spread of Cd over the window
FORCE_SUM_TOL = 1e-3


def cd_batch_statistics(values: np.ndarray) -> tuple[float, tuple[float, float]]:
    """Student-t interval for 10 batch means, inflated for positive lag-1 batch correlation.

    This quantifies numerical iteration means, not physical-time turbulence uncertainty.
    Negative sample correlation cannot shrink the interval below the independent-batch estimate.
    """
    from scipy.stats import t

    if values.ndim != 1 or len(values) != CD_AVERAGING_WINDOW or not np.all(np.isfinite(values)):
        raise ValueError(f"Cd statistics require {CD_AVERAGING_WINDOW} finite samples")
    batches = values.reshape(CD_BATCHES, -1).mean(axis=1)
    mean = float(batches.mean())
    centred = batches - mean
    variance = float(np.var(batches, ddof=1))
    denom = float(centred @ centred)
    rho = float(centred[:-1] @ centred[1:] / denom) if denom > 0 else 0.0
    rho = min(max(rho, 0.0), 0.99)
    correction = (1 + rho) / (1 - rho)
    half_width = float(t.ppf(0.975, CD_BATCHES - 1)) * math.sqrt(variance * correction / CD_BATCHES)
    return mean, (mean - half_width, mean + half_width)


def _mesh_status(case_dir: Path, res: RunResult) -> None:
    path = case_dir / "log.checkMesh"
    check = path.read_text() if path.exists() else ""
    res.mesh_failures = []
    for line in check.splitlines():
        if line.strip().startswith("cells:"):
            res.cells = int(line.split()[-1])
        if line.strip().startswith("***"):
            res.mesh_failures.append(line.strip())
    res.mesh_ok = "Mesh OK." in check and not res.mesh_failures


def evaluate(case_dir: Path, res: RunResult) -> None:
    """Fill quality fields and decide scientific acceptance (spec §4.2a, §4.4a)."""
    _mesh_status(case_dir, res)
    if not res.mesh_ok:
        res.reasons.append("checkMesh reported failures: " + "; ".join(res.mesh_failures))
    manifest = json.loads((case_dir / "daedalus_manifest.json").read_text())
    mode = manifest["config"].get("acceptance_mode", "steady")
    if mode not in ("steady", "averaged"):
        raise CfdError(f"invalid acceptance mode {mode!r}")
    res.acceptance_mode = mode
    solver_path = case_dir / "log.simpleFoam"
    solver_log = solver_path.read_text() if solver_path.exists() else ""
    res.converged_by_residuals = (
        "reached convergence criteria" in solver_log or "SIMPLE solution converged" in solver_log
    )
    pp = case_dir / "postProcessing"
    coeff = next(iter(sorted(pp.glob("forceCoeffs/*/coefficient.dat"))), None)
    if coeff is None:
        res.reasons.append("no forceCoeffs output")
        res.acceptance = "rejected"
        return
    names, data = read_dat(coeff)
    cd_col, cl_col = names.index("Cd"), names.index("Cl")
    if not np.all(np.isfinite(data[:, [0, cd_col, cl_col]])):
        res.reasons.append("non-finite coefficient history")
        res.acceptance = "rejected"
        return
    res.iterations = int(data[-1, 0])
    window_size = CD_AVERAGING_WINDOW if mode == "averaged" else CD_STABILITY_WINDOW
    window = data[-window_size:, cd_col]
    mean = float(window.mean())
    if mean <= 0:
        res.reasons.append("mean Cd must be positive")
    res.cd_window_spread = float(np.ptp(window) / abs(mean)) if mean != 0 else None
    res.cd_mean = mean
    res.cd = mean if mode == "averaged" else float(data[-1, cd_col])
    res.cl = (
        float(data[-window_size:, cl_col].mean()) if mode == "averaged" else float(data[-1, cl_col])
    )
    if len(window) < window_size:
        res.reasons.append(f"Cd gate needs a complete {window_size}-sample window")
    if mode == "averaged":
        if len(window) < CD_AVERAGING_WINDOW or res.iterations < 2 * CD_AVERAGING_WINDOW:
            res.reasons.append("averaged gate needs 500 samples after at least 1000 iterations")
        else:
            _, res.cd_ci95 = cd_batch_statistics(window)
            half_width = (res.cd_ci95[1] - res.cd_ci95[0]) / 2
            if mean > 0 and half_width / mean > CD_STABILITY_TOL:
                res.reasons.append(f"Cd mean CI not stable: {half_width / mean:.2%} half-width")
    elif res.cd_window_spread is None or res.cd_window_spread > CD_STABILITY_TOL:
        res.reasons.append(
            f"Cd not stable: {res.cd_window_spread} relative spread over the last "
            f"{CD_STABILITY_WINDOW} iterations"
        )

    total = np.zeros(3)
    force_files = sorted(pp.glob("forces_*/*/force.dat"))
    for f in force_files:
        group = f.parent.parent.name.removeprefix("forces_")
        _, d = read_dat(f)
        if mode == "averaged":
            times = data[-window_size:, 0]
            selected = d[np.isin(d[:, 0], times)]
            if len(selected) != len(times) or not np.array_equal(selected[:, 0], times):
                res.reasons.append(f"{group}: force history does not match Cd averaging window")
                continue
            last = selected.mean(axis=0)
        else:
            last = d[-1]
        if not np.all(np.isfinite(last[1:10])):
            res.reasons.append(f"{group}: non-finite component force")
            continue
        # Same window as Cd; half model forces x2 for full-car reporting.
        tot = last[1:4] * 2.0
        res.forces_n[group] = {
            "drag_x": float(tot[0]),
            "side_y": float(tot[1]),
            "lift_z": float(tot[2]),
            "pressure_drag_x": float(last[4] * 2.0),
            "viscous_drag_x": float(last[7] * 2.0),
        }
        total += tot
    expected_groups = {
        "wheels" if g in ("wheels_front", "wheels_rear") else g for g in manifest["car"]["groups"]
    }
    missing = expected_groups - res.forces_n.keys()
    if missing:
        res.reasons.append("missing component force histories: " + ", ".join(sorted(missing)))
    if not res.forces_n:
        res.reasons.append("no usable component force output")
    elif res.cd is not None and res.cd > 0:
        q = 0.5 * manifest["config"]["rho_kg_m3"]
        ref = manifest["reference"]
        cd_from_groups = total[0] / (q * ref["U_m_s"] ** 2 * ref["Aref_full_m2"])
        rel = abs(cd_from_groups - res.cd) / abs(res.cd)
        res.force_sum_check = {
            "cd_from_groups": float(cd_from_groups),
            "relative_difference": float(rel),
        }
        if rel > FORCE_SUM_TOL:
            res.reasons.append(f"component force sum differs from total by {rel:.2%}")
    res.acceptance = "pending_review" if not res.reasons else "rejected"
