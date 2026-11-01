"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Maximize2, Minimize2, Wind } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragBuildupChart } from "@/components/charts/DragBuildupChart";
import {
  EmptyState,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
  Skeleton,
  ViewerFallback,
} from "@/components/ui/primitives";
import type { CameraPreset } from "@/components/viewer/types";
import { ControlRail } from "@/components/viewer/flow/ControlRail";
import { LayerOptions } from "@/components/viewer/flow/LayerOptions";
import {
  CameraBar,
  ErrorChip,
  LegendStack,
  type LegendSpec,
  ProbeChip,
  StatsBadge,
  StatusLine,
} from "@/components/viewer/flow/ViewerHud";
import {
  cameraBus,
  DEFAULT_LAYERS,
  type FlowLayers,
  type Probe,
  type ViewStats,
} from "@/components/viewer/flow/types";
import { useDeltaSurface } from "@/components/viewer/flow/useDeltaSurface";
import { getDragBuildup, getFlowField, listCfdRuns } from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FlowScene = dynamic(
  () => import("@/components/viewer/flow/FlowScene").then((m) => m.FlowScene),
  { ssr: false, loading: ViewerFallback },
);
const CompareView = dynamic(
  () => import("@/components/viewer/flow/CompareView").then((m) => m.CompareView),
  { ssr: false, loading: ViewerFallback },
);

const GPU_BUDGET_MIB = 600;

export function FlowPanel({ runId, hasViz }: { runId: string; hasViz: boolean }) {
  const field = useQuery({
    queryKey: ["flow-field", runId],
    queryFn: () => getFlowField(runId),
    enabled: hasViz,
    staleTime: Infinity,
  });
  const buildup = useQuery({
    queryKey: ["drag-buildup", runId],
    queryFn: () => getDragBuildup(runId),
    enabled: hasViz,
    staleTime: Infinity,
    retry: false,
  });
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, staleTime: 15_000 });
  const [layers, setLayers] = useState<FlowLayers>(DEFAULT_LAYERS);
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [max, setMax] = useState(false);
  const [fly, setFly] = useState(false);
  const [record, setRecord] = useState(false);
  const [compareOn, setCompareOn] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [mode, setMode] = useState<"side" | "delta">("delta");
  const marker = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const bus = useMemo(() => cameraBus(), []);

  const candidates = useMemo(
    () => (runs.data ?? []).filter((r) => r.has_viz && r.run_id !== runId),
    [runs.data, runId],
  );
  const compare = useQuery({
    queryKey: ["flow-field", compareId],
    queryFn: () => (compareId ? getFlowField(compareId) : Promise.reject(new Error("no run"))),
    enabled: compareOn && compareId != null,
    staleTime: Infinity,
  });
  const delta = useDeltaSurface(
    field.data?.surface,
    compareOn && mode === "delta" ? compare.data?.surface : undefined,
  );

  const handleError = useCallback((message: string) => setError(message), []);
  const handleProbe = useCallback((p: Probe | null) => setProbe(p), []);
  const handleStats = useCallback((next: ViewStats) => setStats(next), []);
  const handleMarker = useCallback((x: number | null) => {
    marker.current = x;
  }, []);

  const meta = field.data?.meta;
  const cpRange = useMemo((): [number, number] => {
    const range = field.data?.surface.range ?? [-1, 1];
    const abs = Math.max(...range.map(Math.abs), 1e-6);
    return [-abs, abs];
  }, [field.data]);
  const accepted = meta ? meta.acceptance !== "rejected" : false;

  const legends = useMemo((): LegendSpec[] => {
    if (!field.data) return [];
    const list: LegendSpec[] = [];
    if (compareOn && mode === "delta" && delta.surface) {
      list.push({
        title: "ΔCp",
        map: "coolwarm",
        range: delta.surface.range,
        unit: "dimensionless",
        note: delta.surface.mapped ? "nearest-vertex mapping" : "identical topology",
      });
    } else if (layers.surface === "cp") {
      list.push({ title: "Surface Cp", map: "coolwarm", range: cpRange, unit: "dimensionless" });
    }
    if (layers.surface === "sensitivity" && field.data.sensitivity) {
      list.push({
        title: "Outward sensitivity",
        map: "coolwarm",
        range: [-1, 1],
        unit: "p99-normalised",
        note: "push out ↑ drag (red) / push out ↓ drag (blue)",
      });
    }
    if (layers.surface === "oil" && field.data.oilflow) {
      list.push({
        title: "Wall shear |τw|",
        map: "turbo",
        range: field.data.oilflow.range,
        unit: "Pa",
        note: "red discs = separation",
        swatch: "#ef2e33",
      });
    }
    if (layers.streamlines) {
      list.push({
        title: "Speed / U∞",
        map: "turbo",
        range: field.data.streamlines.range,
        unit: "U/U∞",
      });
    }
    if (layers.wake) {
      const sliceRange =
        field.data.xslices?.ranges?.[layers.sliceScalar] ??
        field.data.xslices?.range ??
        field.data.wake.range;
      list.push({
        title: layers.sliceScalar,
        map: "turbo",
        range: sliceRange,
        unit: layers.sliceScalar === "Cp0" ? "dimensionless" : "Ux/U∞",
      });
    }
    if (layers.shell && field.data.wake_shell) {
      list.push({
        title: "Cp0 on wake shell",
        map: "coolwarm",
        range: field.data.wake_shell.range,
        unit: "dimensionless",
      });
    }
    return list.slice(0, 3);
  }, [field.data, compareOn, mode, delta.surface, layers, cpRange]);

  const toggleCompare = () => {
    const next = !compareOn;
    setCompareOn(next);
    if (next && !compareId && candidates[0]) setCompareId(candidates[0].run_id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag) || target.isContentEditable)
          return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setMax((m) => !m);
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        setPreset("iso");
        setNonce((n) => n + 1);
      } else if (event.code === "Space") {
        event.preventDefault();
        setLayers((l) => ({ ...l, animate: !(l.animate ?? !reducedMotion) }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reducedMotion]);

  return (
    <Panel
      title="Flow fields"
      description="OpenFOAM pressure, streamlines, vortices and wake planes, mirrored to the full car."
      className={cn("lg:col-span-12", max ? "fixed inset-3 z-50 h-auto shadow-2xl" : "h-[780px]")}
      bodyClassName="p-0"
      actions={
        <>
          <ProvenanceBadge value="simulated" />
          <button
            type="button"
            aria-label={max ? "Exit full screen" : "Full screen"}
            onClick={() => setMax((m) => !m)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {max ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </>
      }
    >
      {!hasViz ? (
        <EmptyState icon={<Wind />} title="No flow-field export">
          Run <code className="font-mono">daedalus cfd viz data/runs/{runId}</code> to export
          pressure, streamlines, vortices and wake planes.
        </EmptyState>
      ) : field.isError ? (
        <EmptyState icon={<AlertTriangle />} title="Could not load flow fields">
          {field.error.message}
        </EmptyState>
      ) : !field.data ? (
        <Skeleton className="h-full" />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            {compareOn && compare.data && mode === "side" ? (
              <CompareView
                primary={field.data}
                primaryId={runId}
                comparison={compare.data}
                comparisonId={compareId ?? "comparison"}
                mode="side"
                delta={null}
                deltaError={delta.error}
                layers={layers}
                cpRange={cpRange}
                preset={preset}
                presetNonce={nonce}
                onProbe={handleProbe}
                onStats={handleStats}
                onError={handleError}
                marker={marker}
                reducedMotion={reducedMotion}
                fly={fly && !reducedMotion}
                onFlyEnd={() => setFly(false)}
                record={record && !reducedMotion}
                onRecordEnd={() => setRecord(false)}
                bus={bus}
                budgetMiB={GPU_BUDGET_MIB}
              />
            ) : compareOn && compare.data && mode === "delta" ? (
              <CompareView
                primary={field.data}
                primaryId={runId}
                comparison={compare.data}
                comparisonId={compareId ?? "comparison"}
                mode="delta"
                delta={delta.surface}
                deltaError={delta.error}
                layers={layers}
                cpRange={cpRange}
                preset={preset}
                presetNonce={nonce}
                onProbe={handleProbe}
                onStats={handleStats}
                onError={handleError}
                marker={marker}
                reducedMotion={reducedMotion}
                fly={fly && !reducedMotion}
                onFlyEnd={() => setFly(false)}
                record={record && !reducedMotion}
                onRecordEnd={() => setRecord(false)}
                bus={bus}
                budgetMiB={GPU_BUDGET_MIB}
              />
            ) : (
              <FlowScene
                field={field.data}
                layers={layers}
                cpRange={cpRange}
                preset={preset}
                presetNonce={nonce}
                onProbe={handleProbe}
                onStats={handleStats}
                onError={handleError}
                marker={marker}
                reducedMotion={reducedMotion}
                fly={fly && !reducedMotion}
                onFlyEnd={() => setFly(false)}
                record={record && !reducedMotion}
                onRecordEnd={() => setRecord(false)}
                bus={bus}
                id={runId}
                budgetMiB={GPU_BUDGET_MIB}
              />
            )}

            <ControlRail
              layers={layers}
              setLayers={setLayers}
              available={{
                oil: Boolean(field.data.oilflow),
                sensitivity: Boolean(field.data.sensitivity),
                vortices: Boolean(field.data.vortices),
                shell: Boolean(field.data.wake_shell),
                slices: Boolean(field.data.xslices),
              }}
              compare={compareOn}
              onCompare={toggleCompare}
            />
            <LayerOptions
              layers={layers}
              animating={layers.animate ?? !reducedMotion}
              setLayers={setLayers}
              slices={field.data.xslices}
            />
            <CameraBar
              preset={preset}
              onPreset={(p) => {
                setPreset(p);
                setNonce((n) => n + 1);
              }}
              fly={fly}
              onFly={() => setFly((f) => !f)}
              record={record}
              onRecord={() => setRecord((r) => !r)}
              disabled={reducedMotion}
            />
            <StatsBadge stats={stats} />

            {compareOn && (
              <div className="pointer-events-auto absolute top-14 left-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/85 px-2 py-1.5 backdrop-blur">
                <select
                  aria-label="Comparison run"
                  value={compareId ?? ""}
                  onChange={(e) => setCompareId(e.target.value || null)}
                  className="h-7 max-w-52 rounded-md border bg-background px-2 font-mono text-[11px] text-text-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <option value="" disabled>
                    {candidates.length ? "Choose a run" : "No other exported run"}
                  </option>
                  {candidates.map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      {r.run_id} · {r.speed_m_s} m/s
                    </option>
                  ))}
                </select>
                <SegmentedControl
                  label="Comparison mode"
                  options={[
                    { value: "delta", label: "ΔCp" },
                    { value: "side", label: "Side by side" },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
                {compare.isLoading && (
                  <span className="text-[11px] text-muted-foreground">Loading comparison…</span>
                )}
                {compare.isError && (
                  <span className="text-[11px] text-danger">Comparison export failed</span>
                )}
              </div>
            )}

            {!accepted && meta && (
              <div className="absolute top-28 left-14 z-10 flex max-w-md items-start gap-2 rounded-lg border border-danger/40 bg-card/90 px-3 py-2 text-xs backdrop-blur">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                <span className="text-text-2">
                  Fields from a <b className="text-danger">rejected</b> run. Use them to see the
                  flow, not to quote numbers.
                </span>
              </div>
            )}

            <ProbeChip probe={probe} />
            <LegendStack legends={legends} />
            {error && <ErrorChip message={error} />}
            <StatusLine>
              U∞ {meta?.U_m_s} m/s · iteration {meta?.iterations ?? "—"} ·{" "}
              {meta?.acceptance.replaceAll("_", " ")} · drag to orbit, scroll to zoom, hover to
              probe
            </StatusLine>
          </div>

          <section className="h-48 shrink-0 border-t bg-card" aria-label="Drag build-up">
            <header className="flex min-h-9 items-center gap-3 px-4">
              <h3 className="text-[12px] font-medium text-foreground">Drag build-up</h3>
              {buildup.data?.wall_shear === "available" ? (
                <span className="tabular text-[11px] text-muted-foreground">
                  Σ ΔCd {buildup.data.total_cd.toFixed(4)}
                  {buildup.data.reference_cd != null &&
                    ` · reference ${buildup.data.reference_cd.toFixed(4)}`}
                  {buildup.data.relative_error != null &&
                    ` · Δ ${(buildup.data.relative_error * 100).toFixed(2)}%`}
                </span>
              ) : null}
              <span className="ml-auto text-[10px] text-muted-foreground">
                hover to move the marker plane
              </span>
            </header>
            <div className="h-[calc(100%-2.25rem)] px-1">
              {buildup.data?.wall_shear === "available" ? (
                <DragBuildupChart data={buildup.data} onMarker={handleMarker} />
              ) : buildup.data?.wall_shear === "unavailable" ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                  Wall shear stress is missing ({buildup.data.missing_patches.join(", ")}). Run{" "}
                  <code className="mx-1 font-mono">{buildup.data.instruction}</code> to produce the
                  build-up.
                </div>
              ) : buildup.isError ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                  No drag build-up export for this run. Re-export with wall shear stress to see
                  cumulative ΔCd by component.
                </div>
              ) : (
                <Skeleton className="h-full" />
              )}
            </div>
          </section>
        </div>
      )}
    </Panel>
  );
}
