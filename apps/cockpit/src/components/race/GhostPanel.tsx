"use client";

import { GitCompareArrows } from "lucide-react";
import { chartTheme, useECharts } from "@/components/charts/useECharts";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { Slider } from "@/components/ui/slider";
import type { DeltaPoint } from "./raceMath";
import type { RacePreset } from "./presets";

const MANUAL = "manual";

const fmtGap = (ms: number) => `${ms >= 0 ? "+" : "−"}${Math.abs(ms).toFixed(0)} ms`;

/**
 * Ghost race: a second configuration on the far lane. Either a saved what-if preset or just
 * another CdA; both cars use the primary run's thrust and track, so the comparison is honest.
 */
export function GhostPanel({
  presets,
  selectedId,
  onSelect,
  manualCdaCm2,
  onManualCda,
  gapMs,
  gapNote,
  curve,
  busy,
}: {
  presets: RacePreset[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  manualCdaCm2: number;
  onManualCda: (value: number) => void;
  gapMs: number | null;
  gapNote: string;
  curve: DeltaPoint[];
  busy: boolean;
}) {
  const value = selectedId ?? MANUAL;

  const host = useECharts(() => {
    const t = chartTheme();
    const xs = curve.map((p) => p.x);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 46, right: 14, top: 16, bottom: 28 },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.popover,
        borderColor: t.lineStrong,
        textStyle: { color: t.text, fontSize: 11 },
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)} ms` : "DNF",
      },
      xAxis: {
        type: "value",
        min: xs[0] ?? 0,
        max: xs.at(-1) ?? 1,
        name: "distance, m",
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: t.line } },
        splitLine: { show: false },
        axisLabel: { color: t.muted, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        name: "Δt, ms",
        nameLocation: "middle",
        nameGap: 34,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        splitNumber: 3,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: t.line, opacity: 0.6 } },
        axisLabel: { color: t.muted, fontSize: 10, formatter: (v: number) => v.toFixed(0) },
      },
      series: [
        {
          type: "line",
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 1.5, color: t.brand },
          itemStyle: { color: t.brand },
          areaStyle: { color: t.brand, opacity: 0.08 },
          data: curve.map((p) => [p.x, p.dt === null ? null : p.dt * 1000]),
          markLine:
            gapMs === null
              ? undefined
              : {
                  silent: true,
                  symbol: "none",
                  lineStyle: { color: t.text2, type: "dashed", width: 1 },
                  label: { color: t.text2, fontSize: 10, formatter: `gap ${fmtGap(gapMs)}` },
                  data: [{ xAxis: xs.at(-1) ?? 0 }],
                },
        },
      ],
    };
  }, [curve, gapMs]);

  return (
    <Panel
      title="Ghost race"
      description="ghost − primary at the finish; the Δt(x) curve shows where the time goes."
      actions={busy ? <span className="text-2xs text-muted-foreground">running…</span> : undefined}
      bodyClassName="flex min-h-0 flex-col gap-2.5 p-3"
      className="min-h-0 flex-1"
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <label className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs text-text-2">
          <span>Against</span>
          <select
            aria-label="Ghost configuration"
            value={value}
            onChange={(event) =>
              onSelect(event.target.value === MANUAL ? null : event.target.value)
            }
            className="h-8 min-w-0 rounded-lg border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <option value={MANUAL}>Manual CdA</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="text-right">
          <div
            aria-label="Finish gap"
            className={
              gapMs === null
                ? "tabular font-mono text-lg text-muted-foreground"
                : gapMs < 0
                  ? "tabular font-mono text-lg text-ok"
                  : "tabular font-mono text-lg text-risk"
            }
          >
            {gapMs === null ? gapNote : fmtGap(gapMs)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {gapMs === null ? gapNote : "ghost − primary"}
          </div>
        </div>
      </div>
      {selectedId === null && (
        <div>
          <Slider
            aria-label="Ghost CdA"
            min={0}
            max={500}
            step={0.5}
            value={[manualCdaCm2]}
            onValueChange={(next: number[]) => {
              const v = next[0];
              if (v !== undefined) onManualCda(v);
            }}
            className="px-0.5"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Ghost uses the same mass, thrust and track as the primary run, with CdA{" "}
            {manualCdaCm2.toFixed(1)} cm².
          </p>
        </div>
      )}
      <div className="min-h-24 flex-1">
        {curve.length > 0 ? (
          <div
            ref={host}
            className="h-full w-full"
            role="img"
            aria-label="Ghost time gap by distance"
          />
        ) : (
          <EmptyState
            icon={<GitCompareArrows size={18} />}
            title={busy ? "Waiting for both runs…" : "No ghost trace yet"}
          >
            The gap appears once the primary race and the ghost configuration both finish. Pick a
            preset above or set a different CdA.
          </EmptyState>
        )}
      </div>
    </Panel>
  );
}
