"use client";

import type { WhatIfCurve } from "./whatIf";

const W = 100;
const H = 24;
const PAD_X = 1.5;
const PAD_Y = 2.5;

function timeScale(times: number[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const t of times) {
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (max - min < 1e-6) return { min: min - 0.5, max: max + 0.5 };
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

function point(
  value: number,
  timeS: number,
  valueDomain: { min: number; max: number },
  timeDomain: { min: number; max: number },
): { x: number; y: number } {
  const nx = (value - valueDomain.min) / (valueDomain.max - valueDomain.min || 1);
  const ny = (timeS - timeDomain.min) / (timeDomain.max - timeDomain.min || 1);
  return {
    x: PAD_X + nx * (W - 2 * PAD_X),
    y: H - PAD_Y - ny * (H - 2 * PAD_Y),
  };
}

/** Index runs of consecutive finishing samples; gaps between runs are DNFs, never drawn. */
function finishingRuns(count: number, isFiniteTime: (i: number) => boolean): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!isFiniteTime(i)) {
      if (run.length >= 2) runs.push(run);
      run = [];
    } else {
      run.push(i);
    }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}

export function sweepSummary(points: { timeS: number | null }[]): string {
  const times = points.flatMap((p) => (p.timeS === null ? [] : [p.timeS]));
  if (times.length === 0) return "no DNF-free median yet";
  const min = Math.min(...times);
  const max = Math.max(...times);
  return `${min.toFixed(2)}–${max.toFixed(2)} s`;
}

/**
 * Median race time across a slider's whole domain (spec T08). Pure SVG — an ECharts instance
 * for every slider would cost four more canvases; gaps are DNFs and are never connected.
 */
export function SweepSparkline({
  curve,
  current,
  running,
  label,
}: {
  curve: WhatIfCurve | null;
  current: number;
  running: boolean;
  label: string;
}) {
  const points = curve?.points ?? [];
  const valueDomain = { min: points[0]?.value ?? 0, max: points.at(-1)?.value ?? 1 };
  const times = points.flatMap((p) => (p.timeS === null ? [] : [p.timeS]));
  const timeDomain = timeScale(times);
  const inRange = current >= valueDomain.min && current <= valueDomain.max && points.length > 1;
  const marker = inRange ? point(current, timeDomain.min, valueDomain, { min: 0, max: 1 }) : null;
  const runs = finishingRuns(points.length, (i) => points[i].timeS !== null);

  return (
    <div className="flex items-center gap-2 pr-1 pl-0.5" aria-label={`${label} sweep`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-5 w-full flex-1"
        aria-hidden
      >
        {runs.map((run) => (
          <polyline
            key={run[0]}
            className={running ? "stroke-muted-foreground/50" : "stroke-brand/80"}
            points={run
              .map((i) => {
                const p = point(points[i].value, points[i].timeS ?? 0, valueDomain, timeDomain);
                return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
              })
              .join(" ")}
            fill="none"
            strokeWidth={1.25}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {marker && (
          <line
            x1={marker.x}
            x2={marker.x}
            y1={0}
            y2={H}
            className="stroke-text-2/40"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span className="shrink-0 text-right font-mono text-[9px] leading-tight text-muted-foreground">
        {times.length === 0
          ? running
            ? "sweeping…"
            : (curve?.error ?? "commit to sweep")
          : (curve?.error ?? sweepSummary(points))}
      </span>
    </div>
  );
}
