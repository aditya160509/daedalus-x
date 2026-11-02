"use client";

import { AlertTriangle, FileUp, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { PresetPanel } from "@/components/race/PresetPanel";
import { SliderField } from "@/components/race/SliderField";
import { SweepSparkline } from "@/components/race/SweepSparkline";
import type { RacePreset } from "@/components/race/presets";
import { WHAT_IF_DOMAINS, type WhatIfCurves, type WhatIfParam } from "@/components/race/whatIf";
import { Button, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { estimateThrust, impulse, parseThrustCsv, type ThrustTrace } from "@/lib/thrust";
import type { CarParamsUi, ThrustSource } from "./raceInputsState";
import { DEFAULT_ESTIMATE } from "./raceInputsState";

const SWEEP_PARAMS = ["massG", "cdaCm2", "crr"] as const satisfies ReadonlyArray<
  Exclude<WhatIfParam, "thrustScale">
>;

const FIELD: Record<WhatIfParam, { label: string; unit: string; step: number }> = {
  massG: { label: "Mass", unit: "g", step: 0.5 },
  cdaCm2: { label: "Drag area CdA", unit: "cm²", step: 0.5 },
  crr: { label: "Rolling coefficient", unit: "—", step: 0.005 },
  thrustScale: { label: "Thrust scale", unit: "×", step: 0.05 },
};

export function RaceInputs({
  model,
  onModel,
  car,
  onCar,
  thrustScale,
  onThrustScale,
  source,
  onSource,
  onFileError,
  curves,
  running,
  sweep,
  thrustProvenance,
  presets,
  presetNote,
  onAddPreset,
  onRenamePreset,
  onDeletePreset,
  onApplyPreset,
}: {
  model: "M1" | "M2";
  onModel: (m: "M1" | "M2") => void;
  car: CarParamsUi;
  onCar: (patch: Partial<CarParamsUi>) => void;
  thrustScale: number;
  onThrustScale: (v: number) => void;
  source: ThrustSource;
  onSource: (s: ThrustSource) => void;
  onFileError: (message: string | null) => void;
  curves: WhatIfCurves;
  running: WhatIfParam | null;
  sweep: (param: WhatIfParam) => void;
  thrustProvenance: "estimated" | "measured";
  presets: RacePreset[];
  presetNote: string | null;
  onAddPreset: (preset: RacePreset) => void;
  onRenamePreset: (id: string, name: string) => void;
  onDeletePreset: (id: string) => void;
  onApplyPreset: (preset: RacePreset) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState(false);

  const importFile = async (file: File) => {
    onFileError(null);
    try {
      const parsed: ThrustTrace = parseThrustCsv(await file.text());
      onSource({ kind: "file", name: file.name, trace: parsed, provenance: "measured" });
    } catch (cause) {
      onFileError(cause instanceof Error ? cause.message : "Could not read file");
    }
  };

  const current = {
    massG: car.massG,
    cdaCm2: car.cdaCm2,
    crr: car.crr,
    thrustScale,
    trackM: car.trackM,
    rho: car.rho,
    model,
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      <Panel title="Model" bodyClassName="space-y-3 p-3" className="shrink-0">
        <SegmentedModel value={model} onChange={onModel} />
      </Panel>

      <Panel
        title="What-if"
        actions={
          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            aria-expanded={advanced}
            className="rounded px-1.5 py-0.5 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {advanced ? "Hide advanced" : "Advanced"}
          </button>
        }
        bodyClassName="space-y-3 p-3 pb-4"
        className="shrink-0"
      >
        {SWEEP_PARAMS.map((param) => {
          const f = FIELD[param];
          const value = car[param];
          return (
            <div key={param}>
              <SliderField
                id={`race-${param}`}
                label={f.label}
                unit={f.unit}
                value={value}
                min={WHAT_IF_DOMAINS[param].min}
                max={WHAT_IF_DOMAINS[param].max}
                step={f.step}
                onChange={(v) => onCar({ [param]: v })}
                onCommit={() => sweep(param)}
              />
              {advanced && (
                <SweepSparkline
                  curve={curves[param]}
                  current={value}
                  running={running === param}
                  label={f.label}
                />
              )}
            </div>
          );
        })}
        {advanced && (
          <>
            <div>
              <SliderField
                id="race-thrustScale"
                label={FIELD.thrustScale.label}
                unit={FIELD.thrustScale.unit}
                value={thrustScale}
                min={WHAT_IF_DOMAINS.thrustScale.min}
                max={WHAT_IF_DOMAINS.thrustScale.max}
                step={FIELD.thrustScale.step}
                onChange={onThrustScale}
                onCommit={() => sweep("thrustScale")}
              />
              <SweepSparkline
                curve={curves.thrustScale}
                current={thrustScale}
                running={running === "thrustScale"}
                label={FIELD.thrustScale.label}
              />
              <p className="mt-0.5 text-2xs text-muted-foreground">
                Multiplies the whole thrust curve; 1 is the untouched curve.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-line pt-2">
              <SizedField
                id="race-track"
                label="Track"
                unit="m"
                value={car.trackM}
                min={1}
                max={100}
                step={0.5}
                onChange={(v) => onCar({ trackM: v })}
              />
              <SizedField
                id="race-rho"
                label="Air ρ"
                unit="kg/m³"
                value={car.rho}
                min={0.5}
                max={1.5}
                step={0.001}
                onChange={(v) => onCar({ rho: v })}
              />
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Thrust"
        actions={
          <ProvenanceBadge
            value={thrustProvenance}
            title={source.kind === "file" ? source.name : "parametric assumption"}
          />
        }
        bodyClassName="space-y-2 p-3"
        className="shrink-0"
      >
        {source.kind === "estimate" ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Peak force</dt>
            <dd className="tabular text-right font-mono">{source.params.peakN.toFixed(1)} N</dd>
            <dt className="text-muted-foreground">Rise / decay</dt>
            <dd className="tabular text-right font-mono">
              {source.params.riseS.toFixed(3)} / {source.params.decayTauS.toFixed(3)} s
            </dd>
            <dt className="text-muted-foreground">Burn end</dt>
            <dd className="tabular text-right font-mono">{source.params.burnS.toFixed(2)} s</dd>
            <dt className="text-muted-foreground">Impulse</dt>
            <dd className="tabular text-right font-mono">
              {impulse(estimateThrust(source.params)).toFixed(3)} N·s
            </dd>
          </dl>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="truncate font-mono text-text" title={source.name}>
              {source.name}
            </div>
            <div className="text-muted-foreground">
              {source.trace.t_s.length} samples · up to {source.trace.t_s.at(-1)?.toFixed(3) ?? "?"}{" "}
              s
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1">
              <dt className="text-muted-foreground">Impulse</dt>
              <dd className="tabular text-right font-mono">
                {impulse(source.trace).toFixed(3)} N·s
              </dd>
            </dl>
            <label className="flex items-center gap-2 pt-1 text-text-2">
              <input
                type="checkbox"
                className="accent-[var(--brand)]"
                checked={source.provenance === "measured"}
                onChange={(event) =>
                  onSource({
                    ...source,
                    provenance: event.target.checked ? "measured" : "estimated",
                  })
                }
              />
              From a calibrated instrument
            </label>
          </div>
        )}
        <div className="flex gap-2 border-t border-line pt-2">
          <Button onClick={() => fileInput.current?.click()}>
            <FileUp size={13} /> {source.kind === "estimate" ? "Import CSV" : "Replace CSV"}
          </Button>
          {source.kind === "file" && (
            <Button
              variant="ghost"
              onClick={() => {
                onSource({ kind: "estimate", params: DEFAULT_ESTIMATE });
                onFileError(null);
              }}
            >
              <RotateCcw size={13} /> Use estimate
            </Button>
          )}
        </div>
        {source.kind === "estimate" && (
          <p className="text-2xs text-muted-foreground">
            CSV columns: time [s], force [N]. Server-side import with provenance comes with
            calibration (T09).
          </p>
        )}
        {source.kind === "file" && source.provenance === "estimated" && (
          <p className="flex items-start gap-1.5 text-2xs text-risk">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> Marked as estimated: tick the
            checkbox only for a calibrated instrument run.
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.txt,text/csv"
          className="hidden"
          onChange={(event) => {
            const f = event.target.files?.[0];
            if (f) void importFile(f);
            event.target.value = "";
          }}
        />
      </Panel>

      <PresetPanel
        presets={presets}
        note={presetNote}
        current={current}
        onAdd={onAddPreset}
        onRename={onRenamePreset}
        onDelete={onDeletePreset}
        onApply={onApplyPreset}
      />
    </div>
  );
}

function SegmentedModel({
  value,
  onChange,
}: {
  value: "M1" | "M2";
  onChange: (m: "M1" | "M2") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Model level">
      {(
        [
          { value: "M1", label: "M1", hint: "thrust only" },
          { value: "M2", label: "M2", hint: "+ drag + rolling" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
            value === option.value
              ? "border-brand/60 bg-brand/10 text-brand"
              : "text-text-2 hover:bg-secondary/60"
          }`}
        >
          <span className="font-medium">{option.label}</span>
          <span className="block text-[10px] text-muted-foreground">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

function SizedField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label htmlFor={id} className="block text-xs">
      <span className="text-muted-foreground">
        {label} <span className="font-mono text-[10px]">[{unit}]</span>
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className="tabular mt-1 h-8 w-full rounded-lg border bg-background px-2 text-right font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
    </label>
  );
}
