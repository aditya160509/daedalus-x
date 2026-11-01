"use client";

import type { FlowField } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import type { CameraPreset } from "../types";
import { FlowScene } from "./FlowScene";
import type { CameraBus, DeltaSurface, FlowLayers, Probe, ViewStats } from "./types";

interface Common {
  layers: FlowLayers;
  cpRange: [number, number];
  preset: CameraPreset;
  presetNonce: number;
  onProbe: (p: Probe | null) => void;
  onStats: (stats: ViewStats) => void;
  onError: (message: string) => void;
  marker: { current: number | null };
  reducedMotion: boolean;
  fly: boolean;
  onFlyEnd: () => void;
  record: boolean;
  onRecordEnd: () => void;
  bus: CameraBus;
  budgetMiB: number;
}

/**
 * Two-run comparison. Side mode renders both cars with synchronised cameras; delta mode
 * renders run B's Cp on run A's topology and states whether vertices were mapped.
 */
export function CompareView({
  primary,
  primaryId,
  comparison,
  comparisonId,
  mode,
  delta,
  deltaError,
  ...common
}: Common & {
  primary: FlowField;
  primaryId: string;
  comparison: FlowField;
  comparisonId: string;
  mode: "side" | "delta";
  delta: DeltaSurface | null;
  deltaError: string | null;
}) {
  if (mode === "side") {
    return (
      <div className="grid h-full grid-cols-2 divide-x">
        <ComparePane label={primaryId}>
          <FlowScene {...common} field={primary} id={primaryId} />
        </ComparePane>
        <ComparePane label={comparisonId}>
          <FlowScene
            {...common}
            field={comparison}
            id={comparisonId}
            onStats={() => undefined}
            record={false}
            onRecordEnd={() => undefined}
          />
        </ComparePane>
      </div>
    );
  }
  if (!delta) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {deltaError ?? "Mapping the comparison surface onto this car…"}
      </div>
    );
  }
  return (
    <div className="relative h-full">
      <FlowScene
        {...common}
        field={primary}
        id={primaryId}
        delta={delta}
        onStats={common.onStats}
      />
      <div className="pointer-events-none absolute top-14 left-1/2 z-10 -translate-x-1/2 rounded-md border bg-card/85 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
        ΔCp = {primaryId} − {comparisonId} ·{" "}
        {delta.mapped
          ? `nearest-vertex map, RMS ${(delta.rmsDistance * 1000).toFixed(2)} mm`
          : "identical topology"}
      </div>
    </div>
  );
}

function ComparePane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative min-w-0")}>
      {children}
      <span className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-md border bg-card/85 px-2 py-0.5 font-mono text-[10px] text-text-2 backdrop-blur">
        {label}
      </span>
    </div>
  );
}
