"use client";

import { Camera, Crosshair, GitCompare, Layers3, RotateCw, Ruler } from "lucide-react";
import { SegmentedControl } from "@/components/ui/primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CAMERA_PRESETS, type CameraPreset } from "@/components/viewer/types";
import type { DesignSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";

const SELECT =
  "h-8 max-w-52 rounded-lg border border-transparent bg-white/[0.04] px-2.5 font-mono text-[11px] text-text-2 outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-ring/60";

/**
 * Viewport chrome, laid out like a CAD workspace: model and render mode top-left, view
 * presets top-right, and the studio tools in a dock along the bottom edge.
 */
export function DesignControls({
  designs,
  activeId,
  localName,
  onDesign,
  mode,
  onMode,
  preset,
  onPreset,
  explode,
  onExplode,
  turntable,
  onTurntable,
  dimensions,
  onDimensions,
  measureOn,
  onMeasure,
  onSnapshot,
  compareOn,
  onCompare,
  compareId,
  onCompareId,
  compareOptions,
  busy,
}: {
  designs: DesignSummary[];
  activeId: string | null;
  localName: string | null;
  onDesign: (id: string) => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  preset: CameraPreset;
  onPreset: (preset: CameraPreset) => void;
  explode: number;
  onExplode: (value: number) => void;
  turntable: boolean;
  onTurntable: () => void;
  dimensions: boolean;
  onDimensions: () => void;
  measureOn: boolean;
  onMeasure: () => void;
  onSnapshot: () => void;
  compareOn: boolean;
  onCompare: () => void;
  compareId: string | null;
  onCompareId: (id: string) => void;
  compareOptions: DesignSummary[];
  busy: boolean;
}) {
  return (
    <>
      <div className="glass pointer-events-auto absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-xl p-1.5">
        <select
          aria-label="Design"
          value={localName ? "__local" : (activeId ?? "")}
          onChange={(event) => {
            if (event.target.value !== "__local") onDesign(event.target.value);
          }}
          className={SELECT}
          disabled={designs.length === 0 && !localName}
        >
          {designs.length === 0 && !localName && <option value="">No imported designs</option>}
          {localName && <option value="__local">{localName} · local</option>}
          {designs.map((design) => (
            <option key={design.design_id} value={design.design_id}>
              {design.design_id}
            </option>
          ))}
        </select>
        <SegmentedControl
          label="Render mode"
          value={mode}
          onChange={onMode}
          options={[
            { value: "studio", label: "Studio" },
            { value: "engineering", label: "Engineering" },
          ]}
        />
        {compareOn && compareOptions.length > 0 && (
          <select
            aria-label="Comparison design"
            value={compareId ?? ""}
            onChange={(event) => onCompareId(event.target.value)}
            className={SELECT}
          >
            {compareOptions.map((design) => (
              <option key={design.design_id} value={design.design_id}>
                B · {design.design_id}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        role="group"
        aria-label="Camera view"
        className="glass pointer-events-auto absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-xl p-1"
      >
        {CAMERA_PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preset === option.value}
            onClick={() => onPreset(option.value)}
            className={cn(
              "h-7 min-w-10 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground",
              preset === option.value && "bg-white/[0.09] text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        role="toolbar"
        aria-label="Studio tools"
        className="glass pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl p-1.5"
      >
        <label className="flex h-9 items-center gap-2.5 rounded-xl bg-white/[0.04] pr-3 pl-2.5 text-[11px] text-muted-foreground">
          <Layers3 size={15} aria-hidden />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(event) => onExplode(event.target.valueAsNumber)}
            aria-label="Exploded view amount"
            className="h-1 w-28 accent-brand"
          />
          <span className="tabular w-8 text-right font-mono text-text-2">
            {Math.round(explode * 100)}%
          </span>
        </label>
        <Divider />
        <Tool label="Turntable" pressed={turntable} onClick={onTurntable}>
          <RotateCw size={15} />
        </Tool>
        <Tool
          label="Dimensions (approximate, from the display mesh)"
          pressed={dimensions}
          onClick={onDimensions}
        >
          <Ruler size={15} />
        </Tool>
        <Tool label="Measure between two points" pressed={measureOn} onClick={onMeasure}>
          <Crosshair size={15} />
        </Tool>
        <Tool
          label={
            compareOptions.length === 0 ? "Import a second design to compare" : "Compare designs"
          }
          pressed={compareOn}
          onClick={onCompare}
          disabled={compareOptions.length === 0}
        >
          <GitCompare size={15} />
        </Tool>
        <Divider />
        <Tool label="Save PNG snapshot" onClick={onSnapshot} disabled={busy}>
          <Camera size={15} />
        </Tool>
      </div>
    </>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />;
}

function Tool({
  label,
  pressed,
  onClick,
  disabled,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "grid size-9 place-items-center rounded-xl text-muted-foreground transition-[color,background-color,transform] duration-150 ease-snappy hover:bg-white/[0.07] hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-35",
            pressed && "bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgb(61_214_240/0.35)]",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
