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
import type { CameraPreset } from "@/components/viewer/types";
import { DesignControls } from "@/components/viewer/design/DesignControls";
import { DesignSidebar } from "./DesignSidebar";
import { measure as measureBetween } from "@/components/viewer/design/designMath";
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
              preset={preset}
              onPreset={choosePreset}
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

          {measureOn && <MeasureHud state={measureState} onClear={() => setMeasureState(null)} />}

          {compareActive && !comparison.model && (
            <div className="glass pointer-events-none absolute top-16 right-3 z-10 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground">
              {comparison.error
                ? `Comparison failed: ${comparison.error}`
                : "Loading comparison design…"}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="glass absolute top-16 left-1/2 z-20 flex max-w-lg -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2 text-xs text-danger"
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
        <DesignSidebar
          model={model}
          geometry={geometry}
          summary={summary}
          selected={selected}
          onSelect={setSelected}
        />
      )}

      {measureOn && measurement && (
        <span className="sr-only" aria-live="polite">
          Measured {(measurement.distance * 1000).toFixed(1)} millimetres.
        </span>
      )}
    </div>
  );
}
