"use client";

import { useMemo } from "react";
import type { CameraPreset } from "../types";
import { compareParts, deviationRender, deviationColor, modelPartMeshes } from "./deviation";
import { DesignScene } from "./DesignScene";
import type { CameraBus, Frame, MeasurePoint, MeasureState, ViewMode } from "./types";
import type { LoadedModel } from "@/lib/gltf";

/** Side-by-side designs sharing one orbit bus. The left canvas owns turntable, measure and capture. */
export function DesignCompare({
  primary,
  comparison,
  primaryLabel,
  comparisonLabel,
  frame,
  mode,
  selected,
  onSelect,
  preset,
  presetNonce,
  explode,
  turntable,
  dimensions,
  deviationOn,
  measureOn,
  measure,
  onMeasurePoint,
  onSnapshot,
  bus,
  reducedMotion,
}: {
  primary: LoadedModel;
  comparison: LoadedModel;
  primaryLabel: string;
  comparisonLabel: string;
  frame: Frame;
  mode: ViewMode;
  selected: string | null;
  onSelect: (uuid: string | null) => void;
  preset: CameraPreset;
  presetNonce: number;
  explode: number;
  turntable: boolean;
  dimensions: boolean;
  deviationOn: boolean;
  measureOn: boolean;
  measure: MeasureState | null;
  onMeasurePoint: (point: MeasurePoint) => void;
  onSnapshot: (capture: (() => string | null) | null) => void;
  bus: CameraBus;
  reducedMotion: boolean;
}) {
  const report = useMemo(
    () =>
      deviationOn ? compareParts(modelPartMeshes(primary), modelPartMeshes(comparison)) : null,
    [deviationOn, primary, comparison],
  );
  const render = useMemo(
    () => (report?.status === "ok" ? deviationRender(report) : null),
    [report],
  );

  return (
    <div className="grid h-full grid-cols-2 gap-px bg-border">
      <div className="relative min-h-0">
        <DesignScene
          id="primary"
          model={primary}
          frame={frame}
          mode={mode}
          selected={selected}
          onSelect={onSelect}
          preset={preset}
          presetNonce={presetNonce}
          explode={explode}
          turntable={turntable}
          dimensions={dimensions}
          measureOn={measureOn}
          measure={measure}
          onMeasurePoint={onMeasurePoint}
          onSnapshot={onSnapshot}
          bus={bus}
          reducedMotion={reducedMotion}
        />
        <StageTag label="A" name={primaryLabel} />
      </div>
      <div className="relative min-h-0">
        <DesignScene
          id="comparison"
          model={comparison}
          frame={frame}
          mode={mode}
          selected={null}
          onSelect={() => {}}
          preset={preset}
          presetNonce={presetNonce}
          explode={explode}
          turntable={false}
          dimensions={dimensions}
          deviation={render}
          measureOn={false}
          measure={null}
          onMeasurePoint={() => {}}
          bus={bus}
          reducedMotion={reducedMotion}
        />
        <StageTag label="B" name={comparisonLabel} />
        {report && <DeviationLegend report={report} />}
      </div>
    </div>
  );
}

function DeviationLegend({ report }: { report: ReturnType<typeof compareParts> }) {
  if (report.status === "rejected") {
    return (
      <div className="pointer-events-none absolute top-3 right-3 z-10 max-w-64 rounded-lg border border-risk/40 bg-card/90 p-2.5 text-[10px] text-risk backdrop-blur">
        <div className="font-medium">Deviation unavailable</div>
        <p className="mt-1 text-text-2">{report.reason}</p>
        <p className="mt-1 text-muted-foreground">
          Align both revisions in the same CAD frame before comparing.
        </p>
      </div>
    );
  }
  const stops = [-1, -0.5, 0, 0.5, 1].map((t) => {
    const [r, g, b] = deviationColor(t * report.rangeMm, report.rangeMm);
    return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
  });
  const unmatched = report.referenceOnly.length + report.candidateOnly.length;
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-10 w-64 rounded-lg border bg-card/90 p-2.5 text-[10px] backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">CAD deviation B − A</span>
        <span className="font-mono text-text-2">±{report.rangeMm} mm</span>
      </div>
      <div
        className="mt-1.5 h-2 rounded-sm"
        style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }}
        aria-hidden
      />
      <div className="mt-0.5 flex justify-between font-mono text-muted-foreground">
        <span>−{report.rangeMm} removed</span>
        <span>0</span>
        <span>+{report.rangeMm} added</span>
      </div>
      <p className="mt-1.5 text-text-2">
        Signed distance to A along A&apos;s triangle normals.{" "}
        {report.sampledVertices.toLocaleString()} sampled display-mesh vertices · tolerance{" "}
        {report.toleranceMm} mm.
      </p>
      <p className="mt-1 text-muted-foreground">
        CAD tessellation deviation, not measured manufacturing deviation. A stays visible as the
        reference.
      </p>
      {unmatched > 0 && (
        <p className="mt-1 text-risk">
          {report.referenceOnly.length} A-only · {report.candidateOnly.length} B-only component
          {unmatched === 1 ? "" : "s"} not compared.
        </p>
      )}
    </div>
  );
}

function StageTag({ label, name }: { label: string; name: string }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border bg-card/85 px-2 py-1 text-[11px] backdrop-blur">
      <span className="flex size-4 items-center justify-center rounded-sm bg-brand/15 font-mono text-[10px] text-brand">
        {label}
      </span>
      <span className="font-mono text-text-2">{name}</span>
    </div>
  );
}
