"use client";

import { Circle, Pause, Play, Video } from "lucide-react";
import { SegmentedControl } from "@/components/ui/primitives";
import { type ColormapName, cssGradient } from "@/lib/colormap";
import { cn } from "@/lib/utils";
import type { CameraPreset } from "../types";
import type { Probe, ViewStats } from "./types";

const PRESETS: ReadonlyArray<{ value: CameraPreset; label: string }> = [
  { value: "iso", label: "Iso" },
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "top", label: "Top" },
];

export function CameraBar({
  preset,
  onPreset,
  fly,
  onFly,
  record,
  onRecord,
  disabled,
}: {
  preset: CameraPreset;
  onPreset: (preset: CameraPreset) => void;
  fly: boolean;
  onFly: () => void;
  record: boolean;
  onRecord: () => void;
  disabled: boolean;
}) {
  return (
    <div className="pointer-events-auto absolute top-3 right-3 z-10 flex items-center gap-2">
      <SegmentedControl
        label="Camera preset"
        options={PRESETS}
        value={preset}
        onChange={onPreset}
      />
      <div className="flex items-center gap-1 rounded-lg border bg-card/85 p-1 backdrop-blur">
        <button
          type="button"
          aria-label={fly ? "Stop fly-through" : "Play fly-through"}
          aria-pressed={fly}
          disabled={disabled}
          onClick={onFly}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-40"
        >
          {fly ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <button
          type="button"
          aria-label={record ? "Recording a 12 s WebM" : "Record a 12 s WebM"}
          aria-pressed={record}
          disabled={disabled}
          onClick={onRecord}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:opacity-40",
            record && "text-danger",
          )}
        >
          {record ? <Circle className="size-3 fill-current" /> : <Video className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function StatsBadge({ stats }: { stats: ViewStats | null }) {
  if (!stats) return null;
  return (
    <div className="pointer-events-none absolute top-14 right-3 z-10 rounded-lg border bg-card/75 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
      <span className="tabular text-text-2">{stats.fps} fps</span>
      <span aria-hidden> · </span>
      <span className="tabular">{stats.drawCalls} draws</span>
      <span aria-hidden> · </span>
      <span className="tabular">~{Math.round(stats.estimatedMiB)} MiB</span>
      <span aria-hidden> · </span>
      <span>{stats.effects ? "bloom" : "effects off"}</span>
    </div>
  );
}

export function ProbeChip({ probe }: { probe: Probe | null }) {
  if (!probe) return null;
  const margin = 14;
  const left =
    typeof window === "undefined"
      ? probe.x + margin
      : Math.min(probe.x + margin, window.innerWidth - 230);
  const top =
    typeof window === "undefined"
      ? probe.y + margin
      : Math.min(probe.y + margin, window.innerHeight - 64);
  return (
    <div
      role="status"
      className="pointer-events-none fixed z-50 rounded-md border bg-card/95 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur"
      style={{ left, top }}
    >
      <span className="text-muted-foreground">{probe.layer} · </span>
      <span className="tabular font-medium text-foreground">
        {probe.name} = {probe.value.toFixed(4)}
      </span>
    </div>
  );
}

export interface LegendSpec {
  title: string;
  map: ColormapName;
  range: readonly [number, number];
  unit?: string;
  note?: string;
  swatch?: string;
}

export function LegendStack({ legends }: { legends: LegendSpec[] }) {
  if (!legends.length) return null;
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-10 flex w-56 flex-col gap-1.5">
      {legends.map((legend) => (
        <div key={legend.title} className="rounded-lg border bg-card/90 px-3 py-2 backdrop-blur">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            {legend.swatch && (
              <span
                className="size-2 rounded-full"
                style={{ background: legend.swatch }}
                aria-hidden
              />
            )}
            {legend.title}
            {legend.unit && <span className="text-muted-foreground/70">({legend.unit})</span>}
          </div>
          <div className="h-2 rounded-full" style={{ background: cssGradient(legend.map) }} />
          <div className="tabular mt-1 flex justify-between text-[11px] text-text-2">
            <span>{legend.range[0].toFixed(2)}</span>
            <span>{((legend.range[0] + legend.range[1]) / 2).toFixed(2)}</span>
            <span>{legend.range[1].toFixed(2)}</span>
          </div>
          {legend.note && (
            <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
              {legend.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function StatusLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="pointer-events-none absolute bottom-3 left-14 z-10 max-w-[55%] text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

export function ErrorChip({ message }: { message: string }) {
  return (
    <div className="absolute bottom-12 left-14 z-20 max-w-md rounded-lg border border-danger/40 bg-card/95 px-3 py-2 text-xs text-text-2 shadow-lg">
      {message}
    </div>
  );
}
