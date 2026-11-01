"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Box, FileUp, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Button,
  EmptyState,
  Panel,
  ProvenanceBadge,
  Skeleton,
  ViewerFallback,
} from "@/components/ui/primitives";
import { CAMERA_PRESETS, type CameraPreset } from "@/components/viewer/types";
import { DesignControls } from "@/components/viewer/design/DesignControls";
import {
  matchCadPart,
  measure as measureBetween,
  notWatertight,
} from "@/components/viewer/design/designMath";
import { MeasureHud } from "@/components/viewer/design/MeasureHud";
import {
  cameraBus,
  type Frame,
  type MeasurePoint,
  type MeasureState,
  type ViewMode,
} from "@/components/viewer/design/types";
import { useDesignModel } from "@/components/viewer/design/useDesignModel";
import { listDesigns } from "@/lib/api";
import { type LoadedModel, loadGlb } from "@/lib/gltf";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DesignScene = dynamic(
  () => import("@/components/viewer/design/DesignScene").then((m) => m.DesignScene),
  { ssr: false, loading: ViewerFallback },
);
const DesignCompare = dynamic(
  () => import("@/components/viewer/design/DesignCompare").then((m) => m.DesignCompare),
  { ssr: false, loading: ViewerFallback },
);

export function DesignWorkspace() {
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns, staleTime: 60_000 });
  const [manualId, setManualId] = useState<string | null>(null);
  const [local, setLocal] = useState<LoadedModel | null>(null);
  const activeId = local ? null : (manualId ?? designs.data?.[0]?.design_id ?? null);
  const remote = useDesignModel(activeId);
  const model = local ?? remote.model;
  const geometry = local ? null : remote.geometry;
  const loading = !local && remote.loading;

  const [selected, setSelected] = useState<string | null>(null);
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [maximised, setMaximised] = useState(false);
  const [mode, setMode] = useState<ViewMode>("studio");
  const [explode, setExplode] = useState(0);
  const [turntable, setTurntable] = useState(false);
  const [dimensions, setDimensions] = useState(true);
  const [measureOn, setMeasureOn] = useState(false);
  const [measureState, setMeasureState] = useState<MeasureState | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const snapshot = useRef<(() => string | null) | null>(null);
  const bus = useMemo(() => cameraBus(), []);
  const reducedMotion = useReducedMotion();

  const compareOptions = useMemo(
    () => (designs.data ?? []).filter((design) => design.design_id !== activeId),
    [designs.data, activeId],
  );
  const compareActive = compareOn && compareOptions.length > 0;
  const effectiveCompareId = compareActive
    ? compareId && compareId !== activeId
      ? compareId
      : (compareOptions[0]?.design_id ?? null)
    : null;
  const comparison = useDesignModel(effectiveCompareId);

  const frame = useMemo<Frame | null>(
    () =>
      model
        ? {
            center: model.bounds.center,
            radius: Math.max(model.extents.x, model.extents.y, model.extents.z) / 2,
          }
        : null,
    [model],
  );

  const selectedPart = model?.parts.find((part) => part.uuid === selected) ?? null;
  const cadPart =
    selectedPart && geometry
      ? matchCadPart(selectedPart.label, selectedPart.centroid, geometry.parts)
      : null;
  const watertight =
    selectedPart && geometry ? !notWatertight(selectedPart.label, geometry.warnings) : null;
  const partWarnings =
    selectedPart && geometry
      ? geometry.warnings.filter((warning) => warning.includes(`'${selectedPart.label}'`))
      : [];
  const measurement = measureState?.b
    ? measureBetween(measureState.a.point, measureState.b.point)
    : null;
  const summary = designs.data?.find((design) => design.design_id === activeId) ?? null;
  const busy = loading || loadingLocal || designs.isLoading;

  const open = useCallback(async (file: File) => {
    setError(null);
    if (!/\.glb$/i.test(file.name)) {
      setError(
        "Only binary glTF (.glb) is supported for display. Use STEP/native CAD for geometry checks.",
      );
      return;
    }
    setLoadingLocal(true);
    try {
      const loaded = await loadGlb(file);
      setLocal(loaded);
      setSelected(null);
      setMeasureState(null);
      setMeasureOn(false);
      setCompareOn(false);
      setNonce((value) => value + 1);
    } catch (cause) {
      setError(
        `Could not read ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  const chooseDesign = (id: string) => {
    setLocal(null);
    setManualId(id);
    setSelected(null);
    setMeasureState(null);
    setMeasureOn(false);
    setError(null);
    setNonce((value) => value + 1);
  };

  const choosePreset = (next: CameraPreset) => {
    setPreset(next);
    setNonce((value) => value + 1);
  };

  const addMeasurePoint = useCallback((point: MeasurePoint) => {
    setMeasureState((previous) => {
      if (!previous || previous.b) return { a: point, b: null };
      return { a: previous.a, b: point };
    });
  }, []);

  const toggleMeasure = () => {
    if (measureOn) {
      setMeasureOn(false);
      setMeasureState(null);
    } else {
      setMeasureOn(true);
    }
  };

  const registerSnapshot = useCallback((capture: (() => string | null) | null) => {
    snapshot.current = capture;
  }, []);

  const takeSnapshot = () => {
    const capture = snapshot.current;
    if (!capture) {
      setError("Snapshot is unavailable until the model has rendered.");
      return;
    }
    const url = capture();
    if (!url) {
      setError("The renderer could not produce a snapshot.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeId ?? "design"}-${mode}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.png`;
    link.click();
  };

  const toggleCompare = () => {
    if (compareOn) {
      setCompareOn(false);
      return;
    }
    if (compareOptions.length === 0) return;
    setCompareId(compareOptions[0]?.design_id ?? null);
    setCompareOn(true);
  };

  return (
    <div
      className={cn("grid h-full gap-3 p-3", maximised ? "grid-cols-1" : "grid-cols-[1fr_360px]")}
    >
      <Panel
        title={local ? local.fileName : (activeId ?? "Viewport")}
        description={summary?.source_file ?? (local ? "local GLB" : undefined)}
        actions={
          <>
            {model && (
              <div className="hidden items-center gap-2 md:flex">
                <CameraPresetPicker value={preset} onChange={choosePreset} />
              </div>
            )}
            <ProvenanceBadge value="estimated" title="display mesh, not canonical CAD" />
            <Button onClick={() => input.current?.click()} disabled={busy}>
              <FileUp size={13} /> {model ? "Replace" : "Import GLB"}
            </Button>
            {model && (
              <Button
                variant="ghost"
                aria-label={maximised ? "Restore layout" : "Maximise viewport"}
                onClick={() => setMaximised((value) => !value)}
              >
                {maximised ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </Button>
            )}
            <input
              ref={input}
              type="file"
              accept=".glb,model/gltf-binary"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void open(file);
                event.target.value = "";
              }}
            />
          </>
        }
        bodyClassName="relative"
        className="min-h-0"
      >
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            dragOver && "bg-brand/5 ring-2 ring-brand ring-inset",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) void open(file);
          }}
        >
          {model && frame ? (
            compareActive && comparison.model ? (
              <DesignCompare
                primary={model}
                comparison={comparison.model}
                primaryLabel={activeId ?? model.fileName}
                comparisonLabel={effectiveCompareId ?? "comparison"}
                frame={frame}
                mode={mode}
                selected={selected}
                onSelect={setSelected}
                preset={preset}
                presetNonce={nonce}
                explode={explode}
                turntable={turntable}
                dimensions={dimensions}
                measureOn={measureOn}
                measure={measureState}
                onMeasurePoint={addMeasurePoint}
                onSnapshot={registerSnapshot}
                bus={bus}
                reducedMotion={reducedMotion}
              />
            ) : (
              <DesignScene
                id="primary"
                model={model}
                frame={frame}
                mode={mode}
                selected={selected}
                onSelect={setSelected}
                preset={preset}
                presetNonce={nonce}
                explode={explode}
                turntable={turntable}
                dimensions={dimensions}
                measureOn={measureOn}
                measure={measureState}
                onMeasurePoint={addMeasurePoint}
                onSnapshot={registerSnapshot}
                bus={bus}
                reducedMotion={reducedMotion}
              />
            )
          ) : busy ? (
            <Skeleton className="h-full" />
          ) : remote.error ? (
            <EmptyState icon={<AlertTriangle size={20} />} title="Could not load the design">
              {remote.error}
              <div className="mt-3">
                <Button onClick={() => input.current?.click()}>
                  <FileUp size={13} /> Import GLB instead
                </Button>
              </div>
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Box size={20} />}
              title="No car model loaded"
              action={
                <Button variant="primary" onClick={() => input.current?.click()}>
                  <FileUp size={13} /> Import GLB
                </Button>
              }
            >
              {designs.isError
                ? "The local API is unreachable, so imported designs cannot be listed. Drop a .glb here or start daedalus-api."
                : "Drop a .glb here or import one. GLB is for display and part selection; CFD and rule checks need the STEP or native CAD file."}
            </EmptyState>
          )}

          {model && frame && (
            <DesignControls
              designs={designs.data ?? []}
              activeId={activeId}
              localName={local?.fileName ?? null}
              onDesign={chooseDesign}
              mode={mode}
              onMode={setMode}
              explode={explode}
              onExplode={setExplode}
              turntable={turntable}
              onTurntable={() => setTurntable((value) => !value)}
              dimensions={dimensions}
              onDimensions={() => setDimensions((value) => !value)}
              measureOn={measureOn}
              onMeasure={toggleMeasure}
              onSnapshot={takeSnapshot}
              compareOn={compareActive}
              onCompare={toggleCompare}
              compareId={effectiveCompareId}
              onCompareId={setCompareId}
              compareOptions={compareOptions}
              busy={busy}
            />
          )}

          {dimensions && model && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
              Dimensions approximate (display mesh)
            </div>
          )}

          {measureOn && <MeasureHud state={measureState} onClear={() => setMeasureState(null)} />}

          {compareActive && !comparison.model && (
            <div className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-lg border bg-card/90 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              {comparison.error
                ? `Comparison failed: ${comparison.error}`
                : "Loading comparison design…"}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="absolute top-28 left-1/2 z-20 flex max-w-lg -translate-x-1/2 items-center gap-2 rounded-sm border border-danger/50 bg-surface-2 px-3 py-2 text-xs text-danger"
            >
              <AlertTriangle size={13} /> {error}
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-2 text-[11px] text-muted-foreground underline"
              >
                dismiss
              </button>
            </div>
          )}
        </div>
      </Panel>

      {!maximised && (
        <aside className="flex min-h-0 flex-col gap-3">
          <Panel
            title="Model"
            actions={
              geometry ? (
                <span className="text-[10px] text-muted-foreground">
                  {geometry.warnings.length} import warning
                  {geometry.warnings.length === 1 ? "" : "s"}
                </span>
              ) : undefined
            }
            bodyClassName="p-3"
            className="shrink-0"
          >
            {model ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <Row k="Length (x)" v={`${mm(geometry?.length_m ?? model.extents.x)} mm`} />
                <Row k="Height (y)" v={`${mm(geometry?.height_m ?? model.extents.y)} mm`} />
                <Row k="Width (z)" v={`${mm(geometry?.width_m ?? model.extents.z)} mm`} />
                {geometry && (
                  <Row k="Frontal area" v={`${(geometry.frontal_area_m2 * 1e4).toFixed(1)} cm²`} />
                )}
                <Row k="Triangles" v={model.triangles.toLocaleString()} />
                <Row k="Parts" v={String(model.parts.length)} />
                <dt className="text-muted-foreground">Source</dt>
                <dd
                  className="truncate font-mono text-[10px] text-text-2"
                  title={summary?.source_file}
                >
                  {geometry?.source_file ?? model.fileName}
                </dd>
                <dt className="text-muted-foreground">SHA-256</dt>
                <dd
                  className="truncate font-mono text-[10px] text-text-2"
                  title={geometry?.source_sha256 ?? model.sha256}
                >
                  {(geometry?.source_sha256 ?? model.sha256).slice(0, 20)}…
                </dd>
                <dd className="col-span-2 pt-1 text-2xs text-muted-foreground">
                  {geometry
                    ? "Dimensions come from the import record; the viewer draws the tessellated display mesh. Not valid for scrutineering."
                    : "Bounding box of the display mesh, assuming glTF metres. Not valid for scrutineering."}
                </dd>
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">Import a model to see its dimensions.</p>
            )}
          </Panel>

          <Panel title="Inspector" bodyClassName="p-3 text-xs" className="shrink-0">
            {selectedPart ? (
              <div className="space-y-2">
                <div>
                  <div className="truncate font-medium text-text" title={selectedPart.label}>
                    {selectedPart.label}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-sm border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-text-2">
                      {selectedPart.group}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedPart.meshCount} mesh{selectedPart.meshCount === 1 ? "" : "es"} ·{" "}
                      {selectedPart.triangles.toLocaleString()} triangles
                    </span>
                  </div>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <Row
                    k="BBox Δx"
                    v={`${mm(selectedPart.bboxMax[0] - selectedPart.bboxMin[0])} mm`}
                  />
                  <Row
                    k="BBox Δy"
                    v={`${mm(selectedPart.bboxMax[1] - selectedPart.bboxMin[1])} mm`}
                  />
                  <Row
                    k="BBox Δz"
                    v={`${mm(selectedPart.bboxMax[2] - selectedPart.bboxMin[2])} mm`}
                  />
                  {cadPart && (
                    <Row
                      k="Volume"
                      v={
                        watertight
                          ? `${(cadPart.volume_m3 * 1e6).toFixed(3)} cm³`
                          : "not watertight"
                      }
                      tone={watertight ? undefined : "danger"}
                    />
                  )}
                  {geometry && !cadPart && <Row k="CAD part" v="not in import record" />}
                </dl>
                {partWarnings.length > 0 && (
                  <ul className="space-y-1 border-t pt-2 text-[10px] text-risk">
                    {partWarnings.slice(0, 2).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
                <p className="text-2xs text-muted-foreground">
                  Display-mesh geometry. Volume and warnings come from the STEP import record.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Select a part in the viewport or the list to inspect its group, triangles, bounding
                box and imported volume.
              </p>
            )}
          </Panel>

          <Panel title="Parts" bodyClassName="overflow-y-auto py-1" className="min-h-0 flex-1">
            {model?.parts.length ? (
              <ul aria-label="Parts">
                {model.parts.map((part) => (
                  <li key={part.uuid}>
                    <button
                      type="button"
                      aria-pressed={part.uuid === selected}
                      onClick={() => setSelected(part.uuid === selected ? null : part.uuid)}
                      className={cn(
                        "flex w-full items-center gap-2 py-1 pr-3 text-left text-xs text-text-2 hover:bg-surface-3 hover:text-text",
                        part.uuid === selected && "bg-brand/10 text-brand",
                      )}
                      style={{ paddingLeft: 12 + part.depth * 12 }}
                    >
                      <span className="truncate">{part.label}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {part.group}
                      </span>
                      <span className="tabular w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                        {part.triangles.toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {model ? "No named parts in this file." : "—"}
              </p>
            )}
          </Panel>
        </aside>
      )}

      {measureOn && measurement && (
        <span className="sr-only" aria-live="polite">
          Measured {(measurement.distance * 1000).toFixed(1)} millimetres.
        </span>
      )}
    </div>
  );
}

function CameraPresetPicker({
  value,
  onChange,
}: {
  value: CameraPreset;
  onChange: (preset: CameraPreset) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {CAMERA_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          aria-pressed={value === preset.value}
          onClick={() => onChange(preset.value)}
          className={cn(
            "h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground",
            value === preset.value && "bg-secondary text-foreground",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "danger" }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          "tabular truncate text-right font-mono text-text",
          tone === "danger" && "text-danger",
        )}
      >
        {v}
      </dd>
    </>
  );
}

function mm(metres: number): string {
  return (metres * 1000).toFixed(1);
}
