"use client";

import { useState } from "react";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Input } from "@/components/ui/input";
import { ProvenanceBadge, SegmentedControl } from "@/components/ui/primitives";

type Point = { value: number; cd: number; low: number; high: number };
type Axis = "yaw" | "ride";

export function parseConditionSweep(text: string): Record<Axis, Point[]> {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (
    header?.trim().toLowerCase() !== "axis,value,cd,cd_low,cd_high" ||
    lines.length < 2 ||
    lines.length > 200
  ) {
    throw new Error("Expected axis,value,cd,cd_low,cd_high and 2–200 result rows.");
  }
  const result: Record<Axis, Point[]> = { yaw: [], ride: [] };
  for (const line of lines) {
    const [axis, ...fields] = line.split(",").map((v) => v.trim());
    const [value, cd, low, high] = fields.map(Number);
    if (
      (axis !== "yaw" && axis !== "ride") ||
      fields.length !== 4 ||
      fields.some((v) => v === "") ||
      ![value, cd, low, high].every(Number.isFinite) ||
      cd <= 0 ||
      low < 0 ||
      low > cd ||
      cd > high ||
      (axis === "ride" && value < 0) ||
      (axis === "yaw" && Math.abs(value) > 180)
    ) {
      throw new Error("Use yaw in degrees or ride in mm and a positive Cd within its interval.");
    }
    if (result[axis].some((p) => p.value === value))
      throw new Error("Sweep coordinates must be unique on each axis.");
    result[axis].push({ value, cd, low, high });
  }
  for (const points of Object.values(result)) points.sort((a, b) => a.value - b.value);
  if (!Object.values(result).some((points) => points.length >= 2))
    throw new Error("Include two points on at least one axis.");
  return result;
}

function SweepChart({ points, axis }: { points: Point[]; axis: Axis }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 56, right: 23, top: 32, bottom: 46 },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        scale: true,
        name: axis === "yaw" ? "Yaw (°)" : "Ride height (mm)",
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: { ...chartAxis(t), type: "value", scale: true, name: "Cd (1)" },
      series: [
        {
          type: "line",
          name: "Cd",
          data: points.map((p) => [p.value, p.cd]),
          itemStyle: { color: t.brand },
        },
        ...points.map((p) => ({
          type: "line",
          name: "Reported interval",
          silent: true,
          symbol: "rect",
          symbolSize: [8, 2],
          lineStyle: { color: t.muted },
          itemStyle: { color: t.muted },
          data: [
            [p.value, p.low],
            [p.value, p.high],
          ],
        })),
      ],
    };
  }, [points, axis]);
  return (
    <div
      ref={host}
      className="h-56 w-full"
      role="img"
      aria-label={
        axis === "yaw" ? "Drag coefficient versus yaw" : "Drag coefficient versus ride height"
      }
    />
  );
}

export function ConditionSweep() {
  const [axis, setAxis] = useState<Axis>("yaw");
  const [data, setData] = useState<ReturnType<typeof parseConditionSweep> | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<"simulated" | "measured">("simulated");
  return (
    <section className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">Yaw and ride-height analysis</h3>
        {data && (
          <ProvenanceBadge
            value={source}
            title="Source type declared by the person importing the sweep"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Import a full-car CFD or wind-tunnel sweep. Hold speed and the other axis fixed within each
        series. The native half-car solver covers zero yaw.
      </p>
      <SegmentedControl
        label="Declared sweep source"
        value={source}
        onChange={setSource}
        options={[
          { value: "simulated", label: "CFD" },
          { value: "measured", label: "Wind tunnel" },
        ]}
      />
      <label htmlFor="condition-sweep" className="grid max-w-lg gap-1 text-xs">
        CSV columns · axis,value,cd,cd_low,cd_high
        <Input
          id="condition-sweep"
          type="file"
          accept=".csv"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setData(null);
            setError("");
            if (!file) return;
            try {
              if (file.size > 64000) throw new Error("Sweep file exceeds 64 kB.");
              const parsed = parseConditionSweep(await file.text());
              setData(parsed);
              setFileName(file.name);
              setAxis(parsed.yaw.length >= 2 ? "yaw" : "ride");
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        />
        <span className="text-muted-foreground">
          Use yaw for degrees and ride for height in mm. Supply the interval as reported by the
          source.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {data && (
        <>
          <p className="text-xs text-muted-foreground">
            {fileName} · source and setup are declared by the operator.
          </p>
          <SegmentedControl
            label="Sweep axis"
            value={axis}
            onChange={setAxis}
            options={[
              { value: "yaw", label: "Yaw" },
              { value: "ride", label: "Ride height" },
            ]}
          />
          {data[axis].length >= 2 ? (
            <SweepChart axis={axis} points={data[axis]} />
          ) : (
            <p className="text-xs text-muted-foreground">
              This file has fewer than two results on this axis.
            </p>
          )}
        </>
      )}
    </section>
  );
}
