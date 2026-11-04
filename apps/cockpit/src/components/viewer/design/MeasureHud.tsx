"use client";

import { Button } from "@/components/ui/primitives";
import { measure } from "./designMath";
import type { MeasureState } from "./types";

/** Readout for the two-point measure tool. Every number comes from snapped display vertices. */
export function MeasureHud({
  state,
  onClear,
}: {
  state: MeasureState | null;
  onClear: () => void;
}) {
  const result = state?.b ? measure(state.a.point, state.b.point) : null;
  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 w-64 rounded-lg border bg-card/90 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground">Measure</span>
        <Button variant="ghost" onClick={onClear} className="h-6 px-2 text-[11px]">
          Clear
        </Button>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">Approximate (display mesh)</p>
      {!state && <p className="mt-2 text-[11px] text-text-2">Click a point on the car to start.</p>}
      {state && !state.b && (
        <p className="mt-2 text-[11px] text-text-2">Click a second point to finish.</p>
      )}
      {result && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-muted-foreground">Distance</dt>
          <dd className="tabular text-right font-mono text-risk">
            {(result.distance * 1000).toFixed(1)} mm
          </dd>
          <dt className="text-muted-foreground">Δx</dt>
          <dd className="tabular text-right font-mono text-text-2">
            {(result.dx * 1000).toFixed(1)} mm
          </dd>
          <dt className="text-muted-foreground">Δy</dt>
          <dd className="tabular text-right font-mono text-text-2">
            {(result.dy * 1000).toFixed(1)} mm
          </dd>
          <dt className="text-muted-foreground">Δz</dt>
          <dd className="tabular text-right font-mono text-text-2">
            {(result.dz * 1000).toFixed(1)} mm
          </dd>
        </dl>
      )}
    </div>
  );
}
