"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  EmptyState,
  Metric,
  NumberField,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
  Skeleton,
} from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { getBeamMaterials, solveBeam, type BeamRequest, type BeamResult } from "@/lib/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { LoadComparison } from "./LoadComparison";
import { BeamPlots } from "./BeamPlots";
import { Ruler } from "lucide-react";

type PartId = "tether" | "axle" | "halo" | "rear_wing";

/** Each preset is a cantilever loaded at its tip; the rule tests hang a mass from the part. */
const PARTS: ReadonlyArray<{
  value: PartId;
  label: string;
  shape: "circle" | "rectangle";
  lengthMm: number;
  aMm: number;
  bMm: number;
  loadG: number;
  rule: string;
}> = [
  {
    value: "tether",
    label: "Tether guide",
    shape: "circle",
    lengthMm: 8,
    aMm: 2,
    bMm: 0,
    loadG: 200,
    rule: "T6.3: 200 g on each guide",
  },
  {
    value: "axle",
    label: "Axle",
    shape: "circle",
    lengthMm: 12,
    aMm: 3,
    bMm: 0,
    loadG: 100,
    rule: "T7.13: 100 g on each wheel",
  },
  {
    value: "halo",
    label: "Halo bar",
    shape: "rectangle",
    lengthMm: 25,
    aMm: 6,
    bMm: 3,
    loadG: 1000,
    rule: "T4.4.5: 1 kg on the notch (to be reviewed)",
  },
  {
    value: "rear_wing",
    label: "Rear wing",
    shape: "rectangle",
    lengthMm: 30,
    aMm: 20,
    bMm: 3,
    loadG: 50,
    rule: "No rule test; T9.3 says wings must stay rigid",
  },
];
const G = 9.80665;

function tipLoad(
  lengthMm: number,
  aMm: number,
  bMm: number,
  shape: "circle" | "rectangle",
  material: string,
  forceN: number,
): BeamRequest {
  const length = lengthMm / 1000;
  return {
    length_m: length,
    section:
      shape === "circle"
        ? { kind: "circle", outer_m: aMm / 1000 }
        : { kind: "rectangle", width_m: aMm / 1000, depth_m: bMm / 1000 },
    material,
    supports: { "0": "fixed" },
    point_loads_n: { [String(length)]: forceN },
  };
}

function verdict(sf: number): { tone: "default" | "risk" | "danger"; text: string } {
  if (sf < 1) return { tone: "danger", text: "breaks under this load" };
  if (sf < 2) return { tone: "risk", text: "thin margin" };
  return { tone: "default", text: "holds with margin" };
}

interface CapturedCase {
  id: string;
  part: string;
  materialName: string;
  materialSource: BeamResult["material_source"];
  loadN: number;
  request: BeamRequest;
  result: BeamResult;
}

const loadOf = (request: BeamRequest) =>
  Object.values(request.point_loads_n).reduce((sum, value) => sum + value, 0);

function capturedCsv(cases: CapturedCase[]): string {
  const header = [
    "case",
    "part",
    "material",
    "material_source",
    "length_mm",
    "load_n",
    "safety_factor",
    "peak_stress_mpa",
    "max_deflection_mm",
    "section",
  ];
  const rows = cases.map((item) => [
    item.id,
    item.part,
    item.materialName,
    item.materialSource,
    item.request.length_m * 1000,
    loadOf(item.request).toFixed(3),
    item.result.safety_factor == null ? "" : item.result.safety_factor.toFixed(3),
    item.result.max_stress_mpa.toFixed(3),
    item.result.max_deflection_mm.toFixed(4),
    JSON.stringify(item.request.section),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

/** T21 beam FEM: will this part survive the scrutineering load test? */
export function StrengthPanel() {
  const materials = useQuery({ queryKey: ["beam-materials"], queryFn: getBeamMaterials });
  const [part, setPart] = useState<PartId>("tether");
  const preset = PARTS.find((p) => p.value === part) ?? PARTS[0];
  const [material, setMaterial] = useState("abs");
  const [lengthMm, setLengthMm] = useState(preset.lengthMm);
  const [aMm, setAMm] = useState(preset.aMm);
  const [bMm, setBMm] = useState(preset.bMm);
  const [loadG, setLoadG] = useState(preset.loadG);
  const [captured, setCaptured] = useState<CapturedCase[]>([]);

  const choose = (id: PartId) => {
    const p = PARTS.find((x) => x.value === id) ?? PARTS[0];
    setPart(id);
    setLengthMm(p.lengthMm);
    setAMm(p.aMm);
    setBMm(p.bMm);
    setLoadG(p.loadG);
    setLoadMode("proof");
  };

  const [loadMode, setLoadMode] = useState<"proof" | "launch" | "stopping">("proof");
  const [effectiveMassG, setEffectiveMassG] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const loadN = loadMode === "proof" ? (loadG * G) / 1000 : (effectiveMassG * acceleration) / 1000;
  const req = tipLoad(lengthMm, aMm, bMm, preset.shape, material, loadN);
  const presetResults = useQuery({
    queryKey: ["beam-proof-presets", material],
    queryFn: () =>
      Promise.all(
        PARTS.map(async (p) => ({
          ...p,
          result: await solveBeam(
            tipLoad(p.lengthMm, p.aMm, p.bMm, p.shape, material, (p.loadG * G) / 1000),
          ),
        })),
      ),
    enabled: !!materials.data,
  });
  const debounced = useDebouncedValue(req, 250);
  const result = useQuery({
    queryKey: ["beam", debounced],
    queryFn: () => solveBeam(debounced),
    enabled: !!materials.data,
  });
  const v = result.data ? verdict(result.data.safety_factor ?? Infinity) : null;
  const inputsDirty = JSON.stringify(req) !== JSON.stringify(debounced);
  const canCapture =
    !!result.data &&
    !result.isFetching &&
    !inputsDirty &&
    !materials.isPending &&
    captured.length < 4;

  const columns: DataColumn<CapturedCase>[] = [
    {
      accessorKey: "part",
      header: "Part",
      cell: (cell) => (
        <span>
          <span className="block">{String(cell.getValue())}</span>
          <span className="block font-mono text-2xs text-muted-foreground">
            {cell.row.original.request.length_m * 1000} mm ·{" "}
            {cell.row.original.request.section.kind}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "materialName",
      header: "Material",
      cell: (cell) => (
        <span>
          <span className="block">{String(cell.getValue())}</span>
          <span className="block text-2xs text-muted-foreground">
            {cell.row.original.materialSource} strength
          </span>
        </span>
      ),
    },
    {
      accessorKey: "loadN",
      header: "Load",
      meta: { numeric: true },
      cell: (cell) =>
        `${(Number(cell.getValue()) / G).toFixed(0)} g · ${Number(cell.getValue()).toFixed(2)} N`,
    },
    {
      id: "safety",
      accessorFn: (row) => row.result.safety_factor,
      header: "Safety factor",
      meta: { numeric: true },
      cell: (cell) =>
        cell.row.original.result.safety_factor == null
          ? "not applicable (no stress)"
          : cell.row.original.result.safety_factor.toFixed(2),
    },
    {
      id: "stress",
      accessorFn: (row) => row.result.max_stress_mpa,
      header: "Peak stress (MPa)",
      meta: { numeric: true },
      cell: (cell) => cell.row.original.result.max_stress_mpa.toFixed(1),
    },
    {
      id: "deflection",
      accessorFn: (row) => row.result.max_deflection_mm,
      header: "Deflection (mm)",
      meta: { numeric: true },
      cell: (cell) => cell.row.original.result.max_deflection_mm.toFixed(3),
    },
    {
      id: "remove",
      header: "",
      cell: (cell) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Remove captured ${cell.row.original.part} case`}
          onClick={() =>
            setCaptured((rows) => rows.filter((row) => row.id !== cell.row.original.id))
          }
        >
          Remove
        </Button>
      ),
    },
  ];

  const capture = () => {
    if (!canCapture || !result.data) return;
    const material = materials.data?.materials[debounced.material];
    setCaptured((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        part: preset.label,
        materialName: material?.name ?? debounced.material,
        materialSource: result.data.material_source,
        loadN: loadOf(debounced),
        request: structuredClone(debounced),
        result: structuredClone(result.data),
      },
    ]);
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([capturedCsv(captured)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "beam-safety-cases.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Panel
      title="Strength · beam FEA"
      description="Each part is treated as a cantilever fixed at its root with the test mass at its tip."
      actions={result.data && <ProvenanceBadge value={result.data.material_source} />}
      bodyClassName="flex flex-col gap-4 p-4"
    >
      <SegmentedControl options={PARTS} value={part} onChange={choose} label="Part" />
      <SegmentedControl
        label="Load case"
        options={
          [
            { value: "proof", label: "Static test" },
            { value: "launch", label: "Launch" },
            { value: "stopping", label: "Stopping" },
          ] as const
        }
        value={loadMode}
        onChange={setLoadMode}
      />
      <p className="text-2xs text-muted-foreground">
        {loadMode === "proof"
          ? preset.rule
          : "Equivalent static load F = m × a. Enter the mass carried by this part and the peak acceleration magnitude along its bending direction. This does not model impact or transient response."}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs" htmlFor="beam-material">
          <span className="text-muted-foreground">Material</span>
          <select
            id="beam-material"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
          >
            {Object.entries(materials.data?.materials ?? {}).map(([key, m]) => (
              <option key={key} value={key}>
                {m.name} · {m.youngs_modulus_gpa} GPa
              </option>
            ))}
          </select>
        </label>
        <NumberField
          id="beam-length"
          label="Length"
          unit="mm"
          value={lengthMm}
          onChange={setLengthMm}
          min={1}
          max={200}
          step={0.5}
        />
        <NumberField
          id="beam-a"
          label={preset.shape === "circle" ? "Diameter" : "Width"}
          unit="mm"
          value={aMm}
          onChange={setAMm}
          min={0.2}
          max={80}
          step={0.1}
        />
        {preset.shape === "rectangle" && (
          <NumberField
            id="beam-b"
            label="Thickness (load direction)"
            unit="mm"
            value={bMm}
            onChange={setBMm}
            min={0.2}
            max={40}
            step={0.1}
          />
        )}
        {loadMode === "proof" ? (
          <NumberField
            id="beam-load"
            label="Test mass"
            unit="g"
            value={loadG}
            onChange={setLoadG}
            min={1}
            max={5000}
            step={10}
          />
        ) : (
          <>
            <NumberField
              id="beam-effective-mass"
              label="Supported mass"
              unit="g"
              value={effectiveMassG}
              onChange={setEffectiveMassG}
              min={0}
              max={5000}
              step={1}
            />
            <NumberField
              id="beam-acceleration"
              label={loadMode === "launch" ? "Launch acceleration" : "Stopping deceleration"}
              unit="m/s²"
              value={acceleration}
              onChange={setAcceleration}
              min={0}
              max={100000}
              step={1}
            />
            <Metric label="Equivalent tip force" value={loadN.toFixed(2)} unit="N" />
          </>
        )}
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">All-part preset safety factors</h3>
        <p className="text-2xs text-muted-foreground">
          Uses the selected material and the preset dimensions for all four parts. Rear wing load is
          illustrative.
        </p>
        {presetResults.isError ? (
          <p role="alert" className="text-xs text-destructive">
            {presetResults.error.message}
          </p>
        ) : presetResults.data ? (
          <DataTable
            data={presetResults.data}
            label="All-part preset safety factors"
            columns={[
              { accessorKey: "label", header: "Part" },
              { accessorKey: "loadG", header: "Test mass (g)", meta: { numeric: true } },
              {
                accessorFn: (row) => row.result.safety_factor,
                id: "sf",
                header: "Safety factor",
                meta: { numeric: true },
                cell: ({ row }) => row.original.result.safety_factor?.toFixed(2) ?? "—",
              },
              { accessorKey: "rule", header: "Load source" },
            ]}
          />
        ) : (
          materials.data && <Skeleton className="h-24" />
        )}
      </section>
      {materials.error ? (
        <EmptyState icon={<Ruler className="size-5" />} title="Could not load materials">
          {materials.error.message}
        </EmptyState>
      ) : result.error ? (
        <EmptyState icon={<Ruler className="size-5" />} title="Could not solve this part">
          {result.error.message}
        </EmptyState>
      ) : !result.data || !v ? (
        <Skeleton className="h-20" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric
              label="Tip deflection"
              value={result.data.max_deflection_mm.toFixed(3)}
              unit="mm"
            />
            <Metric label="Peak stress" value={result.data.max_stress_mpa.toFixed(1)} unit="MPa" />
            <Metric
              label="Safety factor"
              value={result.data.safety_factor?.toFixed(1) ?? "∞"}
              tone={v.tone}
              hint={v.text}
            />
            <Metric label="Root moment" value={result.data.max_moment_nmm.toFixed(1)} unit="N·mm" />
          </div>
          <BeamPlots data={result.data} />
          {!inputsDirty && loadN > 0 && (
            <LoadComparison
              key={`${part}-${JSON.stringify(req)}`}
              loadN={loadN}
              predicted={result.data.max_deflection_mm}
            />
          )}
          <p className="text-2xs text-muted-foreground">
            Material values for {result.data.material} are handbook estimates. 3D-printed parts are
            weaker than moulded ones; measure your own material before quoting this number.
          </p>
          <section
            aria-label="Configured-part safety comparison"
            className="space-y-2 border-t pt-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Configured-part comparison</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={!canCapture} onClick={capture}>
                  Capture current case ({captured.length}/4)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={captured.length === 0}
                  onClick={exportCsv}
                >
                  Export CSV
                </Button>
              </div>
            </div>
            <p className="text-2xs text-muted-foreground">
              {inputsDirty || result.isFetching
                ? "Waiting for the debounced solver result before this case can be captured."
                : captured.length >= 4
                  ? "Remove a case to capture another; four cases is the comparison limit."
                  : "Captures the exact request and resolved result. Editing the inputs afterwards does not rewrite a row."}
            </p>
            <DataTable
              data={captured}
              columns={columns}
              label="Captured configured-part safety factors"
              empty="No configured case captured yet."
            />
            <p className="text-2xs text-muted-foreground">
              Cases are calculated from their recorded section, material and load. This table is
              local to this browser session and is not saved as evidence. Presets and handbook
              materials remain estimates, not physical load-test validation. A null safety factor
              means zero stress (no load), not an infinite strength claim.
            </p>
          </section>
        </>
      )}
    </Panel>
  );
}
