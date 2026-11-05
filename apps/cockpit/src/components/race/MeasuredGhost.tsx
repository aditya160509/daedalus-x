"use client";

import { useState } from "react";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { deltaTimeCurve, timeAtDistance, type DistanceTrace } from "./raceMath";

type Trace = { name: string; time: number[]; position: number[] };

export function parseMeasuredTrace(text: string, name: string): Trace {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  if (
    header?.trim().toLowerCase() !== "time_s,distance_m" ||
    rows.length < 2 ||
    rows.length > 20000
  ) {
    throw new Error("Expected time_s,distance_m followed by 2–20,000 samples.");
  }
  const trace: Trace = { name, time: [], position: [] };
  for (const row of rows) {
    const fields = row.split(",").map((cell) => cell.trim());
    const [t, x] = fields.map(Number);
    const i = trace.time.length;
    if (
      fields.length !== 2 ||
      fields.some((cell) => !cell) ||
      !Number.isFinite(t) ||
      !Number.isFinite(x) ||
      (i === 0 ? t !== 0 || x !== 0 : t <= trace.time[i - 1] || x < trace.position[i - 1])
    ) {
      throw new Error("Start at 0 s and 0 m. Time must increase and distance must not decrease.");
    }
    trace.time.push(t);
    trace.position.push(x);
  }
  return trace;
}

function GapChart({
  primary,
  ghost,
  finish,
}: {
  primary: DistanceTrace;
  ghost: Trace;
  finish: number;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    const beforeFinish = ghost.position.filter((x) => x < finish);
    const clipped: DistanceTrace = {
      position: [...beforeFinish, finish],
      time: [
        ...ghost.time.slice(0, beforeFinish.length),
        timeAtDistance(finish, ghost.time, ghost.position)!,
      ],
    };
    return {
      animation: false,
      grid: { left: 60, right: 28, top: 30, bottom: 46 },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "Distance (m)",
        nameLocation: "middle",
        nameGap: 26,
      },
      yAxis: { ...chartAxis(t), type: "value", name: "Δ time (ms)" },
      series: [
        {
          type: "line",
          showSymbol: false,
          itemStyle: { color: t.brand },
          data: deltaTimeCurve(primary, clipped).map((p) => [
            p.x,
            p.dt == null ? null : -1000 * p.dt,
          ]),
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed", color: t.muted },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    };
  }, [primary, ghost, finish]);
  return (
    <div
      ref={host}
      className="h-56 w-full"
      role="img"
      aria-label="Predicted time minus fastest measured trace by distance"
    />
  );
}

export function MeasuredGhost({ primary, finish }: { primary: DistanceTrace; finish: number }) {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const eligible = traces
    .flatMap((trace) => {
      const time = timeAtDistance(finish, trace.time, trace.position);
      return time == null ? [] : [{ trace, time }];
    })
    .toSorted((a, b) => a.time - b.time);
  const best = eligible[0];
  return (
    <Panel
      title="Delta to fastest measured run"
      actions={
        <>
          <ProvenanceBadge value="predicted" />
          <ProvenanceBadge value="measured" />
        </>
      }
      description="Upload car-only traces timed from launch. Use runs from the same track and timing setup."
      bodyClassName="space-y-2 p-3"
    >
      <label className="grid gap-1 text-xs">
        CSV traces · time_s,distance_m
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []).slice(0, 12);
            const parsed = await Promise.all(
              files.map(async (file) => {
                try {
                  if (file.size > 512000) throw new Error("File exceeds 512 kB.");
                  return { trace: parseMeasuredTrace(await file.text(), file.name) };
                } catch (error) {
                  return {
                    error: `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
                  };
                }
              }),
            );
            setTraces(parsed.flatMap((r) => (r.trace ? [r.trace] : [])));
            setErrors(parsed.flatMap((r) => (r.error ? [r.error] : [])));
          }}
        />
      </label>
      {errors.length > 0 && (
        <p role="alert" className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      )}
      {best ? (
        <>
          <p className="text-xs text-muted-foreground">
            {best.trace.name} · {best.time.toFixed(3)} s · fastest of {eligible.length} traces
            reaching {finish} m.
          </p>
          <GapChart primary={primary} ghost={best.trace} finish={finish} />
          <p className="text-xs text-muted-foreground">
            Positive means the model arrives later than the measured run at that distance.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Upload up to 12 measured traces reaching the current finish distance.
        </p>
      )}
    </Panel>
  );
}
