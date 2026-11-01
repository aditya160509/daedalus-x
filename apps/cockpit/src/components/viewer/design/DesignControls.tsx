"use client";

import { Camera, Crosshair, GitCompare, RotateCw, Ruler } from "lucide-react";
import { Button, SegmentedControl } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { DesignSummary } from "@/lib/api";
import type { ViewMode } from "./types";

const ACTIVE = "bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand";
const SELECT =
  "h-8 max-w-52 rounded-md border bg-background px-2 font-mono text-[11px] text-text-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

/** Viewport overlay: design switcher, render mode, and the studio tools. */
export function DesignControls({
  designs,
  activeId,
  localName,
  onDesign,
  mode,
  onMode,
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
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 self-start rounded-xl border bg-card/85 p-1.5 backdrop-blur">
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
        <Button
          variant="ghost"
          aria-pressed={compareOn}
          onClick={onCompare}
          disabled={compareOptions.length === 0}
          className={cn("gap-1.5", compareOn && ACTIVE)}
          title={compareOptions.length === 0 ? "Import a second design to compare" : undefined}
        >
          <GitCompare size={13} /> Compare
        </Button>
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

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 self-start rounded-xl border bg-card/85 p-1.5 backdrop-blur">
        <label className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-[11px] text-muted-foreground">
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(event) => onExplode(event.target.valueAsNumber)}
            aria-label="Exploded view amount"
            className="h-1 w-24 accent-brand"
          />
          <span className="tabular w-8 text-right font-mono text-text-2">
            {Math.round(explode * 100)}%
          </span>
        </label>
        <Button
          variant="ghost"
          aria-pressed={turntable}
          onClick={onTurntable}
          className={cn("gap-1.5", turntable && ACTIVE)}
        >
          <RotateCw size={13} /> Turntable
        </Button>
        <Button
          variant="ghost"
          aria-pressed={dimensions}
          onClick={onDimensions}
          className={cn("gap-1.5", dimensions && ACTIVE)}
          title="Length, width and height from the display mesh (approximate)"
        >
          <Ruler size={13} /> Dimensions
        </Button>
        <Button
          variant="ghost"
          aria-pressed={measureOn}
          onClick={onMeasure}
          className={cn("gap-1.5", measureOn && ACTIVE)}
        >
          <Crosshair size={13} /> Measure
        </Button>
        <Button variant="ghost" onClick={onSnapshot} disabled={busy} className="gap-1.5">
          <Camera size={13} /> PNG
        </Button>
      </div>
    </div>
  );
}
