"use client";

import { Toggle } from "@/components/ui/toggle";
import { SegmentedControl } from "@/components/ui/primitives";
import type { FlowLayers } from "./types";

/**
 * Contextual options for the active layers. Only controls that affect something visible
 * are rendered, so the strip never suggests a setting that does nothing.
 */
export function LayerOptions({
  layers,
  setLayers,
  slices,
}: {
  layers: FlowLayers;
  setLayers: React.Dispatch<React.SetStateAction<FlowLayers>>;
  slices: { x_m: number[] } | undefined;
}) {
  const density = layers.streamlines || layers.surface === "oil";
  const wake = layers.wake && slices;
  const vortex = layers.vortices;
  const bands = layers.surface === "cp";
  if (!density && !wake && !vortex && !bands) return null;
  const slice = Math.min(slices ? slices.x_m.length - 1 : 0, Math.max(0, layers.slice));
  const xMm = slices ? slices.x_m[slice] * 1000 : 0;

  return (
    <div className="pointer-events-auto absolute top-3 left-14 z-10 flex max-w-[calc(100%-9rem)] flex-wrap items-center gap-3 rounded-xl border bg-card/85 px-3 py-1.5 text-xs backdrop-blur">
      {bands && (
        <label className="flex items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            className="size-3 accent-brand"
            checked={layers.banded}
            onChange={(e) => setLayers((l) => ({ ...l, banded: e.target.checked }))}
          />
          Bands
        </label>
      )}
      {density && (
        <label className="flex items-center gap-2 text-muted-foreground">
          Seeds
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(layers.density * 100)}
            aria-label="Streamline seed density"
            onChange={(e) => setLayers((l) => ({ ...l, density: e.target.valueAsNumber / 100 }))}
            className="h-1 w-20 accent-brand"
          />
          <span className="tabular w-8 text-right text-text-2">
            {Math.round(layers.density * 100)}%
          </span>
        </label>
      )}
      {layers.streamlines && (
        <Toggle
          size="sm"
          variant="outline"
          pressed={layers.animate}
          onPressedChange={(animate) => setLayers((l) => ({ ...l, animate }))}
          className="h-6 px-2 text-[11px] data-[state=on]:border-brand/50 data-[state=on]:bg-brand/10"
        >
          Animate
        </Toggle>
      )}
      {wake && slices && (
        <>
          <label className="flex items-center gap-2 text-muted-foreground">
            Plane
            <input
              type="range"
              min={0}
              max={slices.x_m.length - 1}
              step={1}
              value={slice}
              aria-label="Wake plane position"
              onChange={(e) => setLayers((l) => ({ ...l, slice: e.target.valueAsNumber }))}
              className="h-1 w-24 accent-brand"
            />
            <span className="tabular w-14 text-right text-text-2">{xMm.toFixed(1)} mm</span>
          </label>
          <SegmentedControl
            label="Wake plane scalar"
            options={[
              { value: "Ux/U∞", label: "Ux/U∞" },
              { value: "Cp0", label: "Cp0" },
            ]}
            value={layers.sliceScalar}
            onChange={(sliceScalar) => setLayers((l) => ({ ...l, sliceScalar }))}
          />
        </>
      )}
      {vortex && (
        <SegmentedControl
          label="Vortex Q level"
          options={[
            { value: "50", label: "Q low" },
            { value: "200", label: "Q high" },
          ]}
          value={String(layers.qLevel)}
          onChange={(level) => setLayers((l) => ({ ...l, qLevel: level === "200" ? 200 : 50 }))}
        />
      )}
    </div>
  );
}
