"use client";

import {
  Camera,
  Crosshair,
  GitCompare,
  Layers3,
  RotateCw,
  Ruler,
  Scissors,
  ScanLine,
} from "lucide-react";
import { SegmentedControl } from "@/components/ui/primitives";
import { CAMERA_PRESETS, type CameraPreset } from "@/components/viewer/types";
import type { DesignSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";

const SELECT =
  "h-8 w-full rounded-lg border border-transparent bg-white/[0.04] px-2.5 font-mono text-[11px] text-text-2 outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-ring/60";

/**
 * The canonical viewport tool set, rendered once inside the Design Studio side panel.
 * The old floating toolbar duplicated the header design picker and covered the model on
 * narrow screens, so every tool now lives here and the viewport keeps only the measure HUD.
 */
export function DesignControls({
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
  section,
  onSection,
  measureOn,
  onMeasure,
  onSnapshot,
  compareOn,
  onCompare,
  deviationOn,
  onDeviation,
  compareId,
  onCompareId,
  compareOptions,
  busy,
}: {
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
  section: number | null;
  onSection: (position: number | null) => void;
  measureOn: boolean;
  onMeasure: () => void;
  onSnapshot: () => void;
  compareOn: boolean;
  onCompare: () => void;
  deviationOn: boolean;
  onDeviation: () => void;
  compareId: string | null;
  onCompareId: (id: string) => void;
  compareOptions: DesignSummary[];
  busy: boolean;
}) {
  return (
    <section
      aria-label="Viewport tools"
      className="shrink-0 rounded-xl border border-border/80 bg-card shadow-panel"
    >
      <header className="flex min-h-11 items-center gap-3 border-b border-border/70 px-4 py-2">
        <h2 className="text-[13px] font-medium tracking-[-0.01em] text-foreground">Viewport</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          display mesh · approximate
        </span>
      </header>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Render mode"
            value={mode}
            onChange={onMode}
            options={[
              { value: "studio", label: "Studio" },
              { value: "engineering", label: "Engineering" },
            ]}
          />
        </div>

        <div>
          <div className="mb-1 text-2xs text-muted-foreground">Camera</div>
          <div role="group" aria-label="Camera view" className="flex flex-wrap gap-1">
            {CAMERA_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preset === option.value}
                onClick={() => onPreset(option.value)}
                className={cn(
                  "h-7 rounded-lg border border-transparent px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
                  preset === option.value && "bg-white/[0.09] text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-2 text-[11px] text-muted-foreground">
          <Layers3 size={15} aria-hidden />
          <span className="sr-only">Exploded view amount</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(event) => onExplode(event.target.valueAsNumber)}
            aria-label="Exploded view amount"
            className="h-1 min-w-0 flex-1 accent-brand"
          />
          <span className="tabular w-8 text-right font-mono text-text-2">
            {Math.round(explode * 100)}%
          </span>
        </label>

        {section != null && (
          <label className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-2 text-[11px] text-muted-foreground">
            <Scissors size={15} aria-hidden />
            <span className="sr-only">Section plane position</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={section}
              onChange={(event) => onSection(event.target.valueAsNumber)}
              aria-label="Section plane position"
              className="h-1 min-w-0 flex-1 accent-brand"
            />
            <span className="tabular w-8 text-right font-mono text-text-2">
              {Math.round(section * 100)}%
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <Tool
            label="Turntable"
            pressed={turntable}
            onClick={onTurntable}
            icon={<RotateCw size={15} />}
          />
          <Tool
            label={section == null ? "Section plane" : "Turn section off"}
            pressed={section != null}
            onClick={() => onSection(section == null ? 0.5 : null)}
            icon={<Scissors size={15} />}
          />
          <Tool
            label="Dimensions"
            pressed={dimensions}
            onClick={onDimensions}
            icon={<Ruler size={15} />}
          />
          <Tool
            label="Measure points"
            pressed={measureOn}
            onClick={onMeasure}
            icon={<Crosshair size={15} />}
          />
          <Tool
            label={compareOptions.length === 0 ? "Compare (needs a second design)" : "Compare"}
            pressed={compareOn}
            onClick={onCompare}
            disabled={compareOptions.length === 0}
            icon={<GitCompare size={15} />}
          />
          <Tool
            label={compareOn ? "Signed deviation (mm)" : "Deviation needs Compare"}
            pressed={deviationOn}
            onClick={onDeviation}
            disabled={!compareOn}
            icon={<ScanLine size={15} />}
          />
          <Tool label="Save PNG" onClick={onSnapshot} disabled={busy} icon={<Camera size={15} />} />
        </div>

        {compareOn && compareOptions.length > 0 && (
          <div>
            <label className="mb-1 block text-2xs text-muted-foreground" htmlFor="compare-design">
              Comparison design (B)
            </label>
            <select
              id="compare-design"
              value={compareId ?? ""}
              onChange={(event) => onCompareId(event.target.value)}
              className={SELECT}
            >
              {compareOptions.map((design) => (
                <option key={design.design_id} value={design.design_id}>
                  {design.design_id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}

function Tool({
  label,
  pressed,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-35",
        pressed && "bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgb(61_214_240/0.35)]",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
