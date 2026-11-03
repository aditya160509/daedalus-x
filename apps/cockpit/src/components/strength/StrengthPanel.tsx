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
import { getBeamMaterials, solveBeam, type BeamRequest } from "@/lib/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
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

function verdict(sf: number): { tone: "default" | "risk" | "danger"; text: string } {
  if (sf < 1) return { tone: "danger", text: "breaks under this load" };
  if (sf < 2) return { tone: "risk", text: "thin margin" };
  return { tone: "default", text: "holds with margin" };
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

  const choose = (id: PartId) => {
    const p = PARTS.find((x) => x.value === id) ?? PARTS[0];
    setPart(id);
    setLengthMm(p.lengthMm);
    setAMm(p.aMm);
    setBMm(p.bMm);
    setLoadG(p.loadG);
  };

  const length = lengthMm / 1000;
  const req: BeamRequest = {
    length_m: length,
    section:
      preset.shape === "circle"
        ? { kind: "circle", outer_m: aMm / 1000 }
        : { kind: "rectangle", width_m: aMm / 1000, depth_m: bMm / 1000 },
    material,
    supports: { "0": "fixed" },
    point_loads_n: { [String(length)]: (loadG / 1000) * G },
  };
  const debounced = useDebouncedValue(req, 250);
  const result = useQuery({
    queryKey: ["beam", debounced],
    queryFn: () => solveBeam(debounced),
    enabled: !!materials.data,
  });
  const v = result.data ? verdict(result.data.safety_factor ?? Infinity) : null;

  return (
    <Panel
      title="Strength · beam FEA"
      description="Each part is treated as a cantilever fixed at its root with the test mass at its tip."
      actions={result.data && <ProvenanceBadge value={result.data.material_source} />}
      bodyClassName="flex flex-col gap-4 p-4"
    >
      <SegmentedControl options={PARTS} value={part} onChange={choose} label="Part" />
      <p className="text-2xs text-muted-foreground">{preset.rule}</p>
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
      </div>
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
          <p className="text-2xs text-muted-foreground">
            Material values for {result.data.material} are handbook estimates. 3D-printed parts are
            weaker than moulded ones; measure your own material before quoting this number.
          </p>
        </>
      )}
    </Panel>
  );
}
