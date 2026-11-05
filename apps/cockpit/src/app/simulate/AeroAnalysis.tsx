"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HeatmapChart, PieChart, ScatterChart } from "echarts/charts";
import { MarkLineComponent, VisualMapComponent } from "echarts/components";
import { Button, Metric, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { type CfdRunDetail, getCfdWake, getCfdRun, listCfdRuns, probeCfdCp } from "@/lib/api";

echarts.use([PieChart, ScatterChart, HeatmapChart, VisualMapComponent, MarkLineComponent]);

const RHO = 1.204;

function fmt(v: number | null | undefined, d = 3) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-3 text-[11px] text-text-3">{children}</p>;
}

/** Pressure vs skin-friction share of total drag (donut). */
function DragSplit({ pressure, viscous }: { pressure: number; viscous: number }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      tooltip: {
        ...chartTooltip(t),
        trigger: "item",
        valueFormatter: (v: number) => `${v.toFixed(4)} N`,
      },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "drag-split" } } },
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "80%"],
          center: ["50%", "46%"],
          itemStyle: { borderColor: "transparent" },
          label: {
            show: true,
            position: "center",
            color: t.text,
            fontFamily: t.mono,
            fontSize: 18,
            formatter:
              () => `${((Math.max(pressure, 0) / Math.max(pressure + viscous, 1e-12)) * 100).toFixed(0)}%
pressure`,
          },
          data: [
            { name: "Pressure", value: Math.max(pressure, 0), itemStyle: { color: t.brand } },
            {
              name: "Skin friction",
              value: Math.max(viscous, 0),
              itemStyle: { color: t.lineStrong },
            },
          ],
        },
      ],
    };
  }, [pressure, viscous]);
  return <div ref={host} className="h-56 w-full" />;
}

/** Drag, side force and lift per part group (grouped horizontal bars). */
function GroupForces({
  forces,
}: {
  forces: Record<string, { drag_x: number; side_y: number; lift_z: number }>;
}) {
  const names = Object.keys(forces).filter((n) => n !== "total");
  const host = useECharts(() => {
    const t = chartTheme();
    const series = (key: "drag_x" | "lift_z", name: string, color: string) => ({
      name,
      type: "bar",
      barWidth: 8,
      itemStyle: { color, borderRadius: 2 },
      data: names.map((n) => forces[n][key]),
    });
    return {
      animation: false,
      grid: { left: 110, right: 24, top: 30, bottom: 28 },
      legend: {
        top: 0,
        right: 40,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "group-forces" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => `${v.toFixed(4)} N`,
      },
      xAxis: {
        type: "value",
        name: "N",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: { type: "category", data: names, ...chartAxis(t), splitLine: { show: false } },
      series: [series("drag_x", "Drag", t.brand), series("lift_z", "Lift", t.risk)],
    };
  }, [forces]);
  return <div ref={host} className="h-64 w-full" />;
}

/** Cd of every run, coloured by acceptance; the selected run is highlighted. */
function RunsCd({ current }: { current: string }) {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns });
  const rows = (runs.data ?? []).filter((r) => r.cd != null);
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 140, right: 24, top: 12, bottom: 28 },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "runs-cd" } } },
      tooltip: { ...chartTooltip(t), trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "value",
        name: "Cd",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: {
        type: "category",
        data: rows.map((r) => r.run_id),
        ...chartAxis(t),
        splitLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barWidth: 10,
          data: rows.map((r) => ({
            value: r.cd,
            itemStyle: {
              borderRadius: 2,
              color: r.acceptance === "accepted" ? t.ok : t.lineStrong,
              opacity: r.run_id === current ? 1 : 0.6,
              borderColor: r.run_id === current ? t.text : "transparent",
              borderWidth: r.run_id === current ? 1 : 0,
            },
          })),
        },
      ],
    };
  }, [rows.length, current]);
  return (
    <div ref={host} style={{ height: Math.max(120, rows.length * 26 + 48) }} className="w-full" />
  );
}

/** Wall-clock time per pipeline step (mesh, solve, post). */
function StepTimes({ steps }: { steps: { name: string; seconds: number }[] }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 130, right: 24, top: 12, bottom: 28 },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "step-times" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => `${v.toFixed(1)} s`,
      },
      xAxis: {
        type: "value",
        name: "s",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: {
        type: "category",
        data: steps.map((s) => s.name),
        ...chartAxis(t),
        splitLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barWidth: 8,
          itemStyle: { color: t.brand, borderRadius: 2 },
          data: steps.map((s) => s.seconds),
        },
      ],
    };
  }, [steps]);
  return (
    <div ref={host} style={{ height: Math.max(120, steps.length * 24 + 48) }} className="w-full" />
  );
}

/** Frontal area vs Cd trade: iso-drag curves through this run (same CdA = same drag). */
function AreaTrade({ cd, area }: { cd: number; area: number }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const cda = cd * area;
    const xs = Array.from({ length: 41 }, (_, i) => area * (0.7 + i * 0.015) * 1e4);
    const iso = (k: number, name: string, color: string) => ({
      name,
      type: "line",
      showSymbol: false,
      lineStyle: { color, width: 1, type: k === 1 ? "solid" : "dashed" },
      data: xs.map((x) => [x, (cda * k) / (x / 1e4)]),
    });
    return {
      animation: false,
      grid: { left: 48, right: 24, top: 30, bottom: 36 },
      legend: {
        top: 0,
        right: 40,
        itemWidth: 12,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "area-trade" } } },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      xAxis: {
        type: "value",
        name: "A cm²",
        min: "dataMin",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: {
        type: "value",
        name: "Cd",
        scale: true,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      series: [
        iso(0.9, "−10% drag", t.ok),
        iso(1, "This run", t.text2),
        iso(1.1, "+10% drag", t.risk),
        {
          name: "Run",
          type: "scatter",
          symbolSize: 9,
          itemStyle: { color: t.brand },
          data: [[area * 1e4, cd]],
        },
      ],
    };
  }, [cd, area]);
  return <div ref={host} className="h-64 w-full" />;
}

/** Drag per part split into pressure and skin friction, biggest first, with share of total. */
function DragByPart({
  forces,
}: {
  forces: Record<string, { pressure_drag_x: number; viscous_drag_x: number }>;
}) {
  const rows = Object.entries(forces)
    .map(([n, f]) => ({ n, p: f.pressure_drag_x, v: f.viscous_drag_x }))
    .toSorted((a, b) => a.p + a.v - (b.p + b.v));
  const total = rows.reduce((s, r) => s + r.p + r.v, 0) || 1;
  const host = useECharts(() => {
    const t = chartTheme();
    const bar = (name: string, key: "p" | "v", color: string) => ({
      name,
      type: "bar",
      stack: "d",
      barWidth: 12,
      itemStyle: { color },
      data: rows.map((r) => r[key]),
    });
    return {
      animation: false,
      grid: { left: 96, right: 64, top: 28, bottom: 28 },
      legend: {
        top: 0,
        right: 40,
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "drag-by-part" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => `${v.toFixed(4)} N`,
      },
      xAxis: {
        type: "value",
        name: "N",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: {
        type: "category",
        data: rows.map((r) => r.n),
        ...chartAxis(t),
        splitLine: { show: false },
        axisLabel: { color: t.text2, fontSize: 11 },
      },
      series: [
        bar("Pressure", "p", t.brand),
        {
          ...bar("Skin friction", "v", t.lineStrong),
          label: {
            show: true,
            position: "right",
            color: t.muted,
            fontFamily: t.mono,
            fontSize: 10,
            formatter: (x: { dataIndex: number }) =>
              `${(((rows[x.dataIndex].p + rows[x.dataIndex].v) / total) * 100).toFixed(0)}%`,
          },
        },
      ],
    };
  }, [forces]);
  return (
    <div ref={host} style={{ height: Math.max(160, rows.length * 30 + 60) }} className="w-full" />
  );
}

/** Momentum-deficit drag at three wake stations against the surface-force drag. */
function WakeDrag({
  stations,
  surface,
}: {
  stations: { x_over_L: number; drag_n: number }[];
  surface: number;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 52, right: 24, top: 16, bottom: 32 },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "wake-drag" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(4)} N`,
      },
      xAxis: { type: "category", data: stations.map((s) => `${s.x_over_L} L`), ...chartAxis(t) },
      yAxis: {
        type: "value",
        name: "N",
        min: 0,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      series: [
        {
          type: "bar",
          barWidth: 18,
          itemStyle: { color: t.brand, borderRadius: 2 },
          data: stations.map((s) => s.drag_n),
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: t.text2, type: "dashed" },
            label: { color: t.muted, formatter: "surface forces" },
            data: [{ yAxis: surface }],
          },
        },
      ],
    };
  }, [stations, surface]);
  return <div ref={host} className="h-56 w-full" />;
}

/** Total-pressure loss behind the car, looking upstream: where the drag is lost. */
function WakeLossMap({
  y,
  z,
  loss,
  label = "Cp₀ loss",
  signed = false,
}: {
  y: number[];
  z: number[];
  loss: (number | null)[][];
  label?: string;
  signed?: boolean;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    const data: [number, number, number][] = [];
    loss.forEach((row, j) => row.forEach((v, i) => v != null && data.push([i, j, v])));
    const limit = signed ? Math.max(0.01, ...data.map(([, , v]) => Math.abs(v))) : 1;
    return {
      animation: false,
      grid: { left: 48, right: 72, top: 12, bottom: 36 },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "wake-loss" } } },
      tooltip: {
        ...chartTooltip(t),
        formatter: (p: { value: [number, number, number] }) =>
          `y ${y[p.value[0]].toFixed(0)} mm · z ${z[p.value[1]].toFixed(0)} mm<br/>${label} ${p.value[2].toFixed(3)} [1]`,
      },
      xAxis: {
        type: "category",
        data: y.map((v) => v.toFixed(0)),
        name: "y mm",
        nameLocation: "middle",
        nameGap: 22,
        ...chartAxis(t),
        axisLabel: { interval: 7, color: t.muted, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: z.map((v) => v.toFixed(0)),
        name: "z mm",
        ...chartAxis(t),
        axisLabel: { interval: 5, color: t.muted, fontSize: 10 },
      },
      visualMap: {
        min: signed ? -limit : 0,
        max: limit,
        calculable: true,
        right: 0,
        top: "middle",
        itemHeight: 120,
        textStyle: { color: t.muted, fontSize: 10 },
        inRange: {
          color: signed
            ? ["#2166ac", "#e9eef3", "#b2182b"]
            : ["#10182a", "#2856a5", "#75c3ea", "#f3e48c"],
        },
      },
      series: [{ type: "heatmap", data, progressive: 0 }],
    };
  }, [y, z, loss, label, signed]);
  return <div ref={host} className="h-72 w-full" role="img" aria-label={label} />;
}

/** Every aerodynamic output for the selected run on one page. */
function CpProbe({ runId, lengthMm }: { runId: string; lengthMm: number }) {
  const [values, setValues] = useState(["0", "0", "40", "200", "0", "40"]);
  const probe = useMutation({
    mutationFn: (coords: number[]) => probeCfdCp(runId, coords.slice(0, 3), coords.slice(3)),
  });
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 45, right: 20, top: 28, bottom: 45 },
      toolbox: { feature: { saveAsImage: { type: "png", name: "cp-probe" } } },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "Distance along line (mm)",
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: { ...chartAxis(t), type: "value", name: "Cp (1)" },
      series: [
        {
          type: "line",
          showSymbol: false,
          connectNulls: false,
          data: probe.data?.samples.map(([m, cp]) => [m * 1000, cp]),
          lineStyle: { color: t.brand },
        },
      ],
    };
  }, [probe.data]);
  return (
    <Panel
      title="Cp probe line"
      actions={<ProvenanceBadge value="simulated" />}
      description="Sample the latest solved pressure field along a line in the engineering frame. Gaps indicate points outside the fluid."
      bodyClassName="space-y-3 p-4"
    >
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          probe.mutate(values.map((value) => Number(value) / 1000));
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          {values.map((value, i) => (
            <label key={i} className="grid gap-1 text-xs">
              {i < 3 ? "Start" : "End"} {"XYZ"[i % 3]} (mm)
              <input
                className="min-w-0 rounded border bg-background p-1"
                type="number"
                step="any"
                required
                value={value}
                onChange={(event) =>
                  setValues(values.map((v, j) => (i === j ? event.target.value : v)))
                }
              />
            </label>
          ))}
        </div>
        <Button
          type="button"
          disabled={probe.isPending}
          onClick={() => {
            const height = Number(values[2]);
            const endpoints = [-20, 0, height, Math.round(lengthMm + 20), 0, height];
            setValues(endpoints.map(String));
            probe.mutate(endpoints.map((v) => v / 1000));
          }}
        >
          Sample centreline at start height
        </Button>
        <Button type="submit" disabled={probe.isPending}>
          {probe.isPending ? "Sampling…" : "Sample line"}
        </Button>
      </form>
      {probe.error && (
        <p role="alert" className="text-xs text-destructive">
          {probe.error.message}
        </p>
      )}
      {probe.data && !probe.data.samples.some(([, cp]) => cp != null) && (
        <p className="text-xs text-muted-foreground">
          No sampled points intersect the solved fluid.
        </p>
      )}
      <div
        ref={host}
        className="h-52 w-full"
        role="img"
        aria-label="Pressure coefficient along the probe line"
      />
    </Panel>
  );
}

function WakeComparison({
  run,
  baseWake,
}: {
  run: CfdRunDetail;
  baseWake: Awaited<ReturnType<typeof getCfdWake>> | undefined;
}) {
  const [otherId, setOtherId] = useState("");
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns });
  const other = useQuery({
    queryKey: ["analysis-comparison", otherId],
    enabled: Boolean(otherId),
    retry: false,
    queryFn: async () => ({
      run: await getCfdRun(otherId),
      wake: await getCfdWake(otherId).catch(() => null),
    }),
  });
  const a = baseWake?.loss_map;
  const b = other.data?.wake?.loss_map;
  const matches =
    a &&
    b &&
    a.x_over_L === b.x_over_L &&
    run.manifest.car.length_m === other.data?.run.manifest.car.length_m &&
    a.y_mm.length === b.y_mm.length &&
    a.z_mm.length === b.z_mm.length &&
    a.y_mm.every((v, i) => v === b.y_mm[i]) &&
    a.z_mm.every((v, i) => v === b.z_mm[i]);
  const delta =
    matches && a && b
      ? a.cpt_loss.map((row, j) =>
          row.map((value, i) => {
            const compared = b.cpt_loss[j]?.[i];
            return value == null || compared == null ? null : compared - value;
          }),
        )
      : null;
  const own = run.result?.forces_n ?? {};
  const compared = other.data?.run.result?.forces_n ?? {};
  const common = Object.keys(own).filter((key) => Object.hasOwn(compared, key));
  return (
    <Panel
      title="Wake and force comparison"
      actions={<ProvenanceBadge value="simulated" />}
      description="Signed differences are comparison run minus selected run."
      bodyClassName="space-y-3 p-3"
    >
      <label className="grid max-w-xs gap-1 text-xs">
        Compare against
        <select
          value={otherId}
          onChange={(e) => setOtherId(e.target.value)}
          className="h-8 rounded border bg-background px-2"
        >
          <option value="">Select solved run…</option>
          {runs.data
            ?.filter((r) => r.run_id !== run.run_id && r.state === "succeeded")
            .map((r) => (
              <option key={r.run_id} value={r.run_id}>
                {r.run_id}
              </option>
            ))}
        </select>
      </label>
      {runs.error && (
        <p role="alert" className="text-xs text-destructive">
          {runs.error.message}
        </p>
      )}
      {otherId && other.isPending && (
        <p className="text-xs text-muted-foreground">Loading comparison…</p>
      )}
      {other.error && (
        <p role="alert" className="text-xs text-destructive">
          {other.error.message}
        </p>
      )}
      {other.data && (
        <>
          <p className="text-xs text-muted-foreground">
            Inlet: {run.manifest.reference.U_m_s} → {other.data.run.manifest.reference.U_m_s} m/s.
            Force changes include any change in inlet or setup.
          </p>
          {common.length > 0 ? (
            <GroupForces
              forces={Object.fromEntries(
                common.map((key) => [
                  key,
                  {
                    drag_x: compared[key].drag_x - own[key].drag_x,
                    lift_z: compared[key].lift_z - own[key].lift_z,
                    side_y: compared[key].side_y - own[key].side_y,
                  },
                ]),
              )}
            />
          ) : (
            <p className="text-xs text-muted-foreground">No matching force groups.</p>
          )}
          {delta && a ? (
            <WakeLossMap y={a.y_mm} z={a.z_mm} loss={delta} label="ΔCp₀ loss" signed />
          ) : (
            <p className="text-xs text-muted-foreground">
              Wake comparison needs two available fields on the same station and sampling grid.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

export function AeroAnalysis({ run }: { run: CfdRunDetail }) {
  const r = run.result;
  const U = run.manifest.reference.U_m_s;
  const A = run.manifest.reference.Aref_full_m2;
  const q = 0.5 * RHO * U * U;
  const total = r?.forces_n?.total;
  const groups = Object.entries(r?.forces_n ?? {}).filter(([n]) => n !== "total");
  const pressure = total?.pressure_drag_x ?? groups.reduce((s, [, f]) => s + f.pressure_drag_x, 0);
  const viscous = total?.viscous_drag_x ?? groups.reduce((s, [, f]) => s + f.viscous_drag_x, 0);
  const drag = r?.cd != null ? r.cd * q * A : null;
  const accepted = r?.acceptance === "accepted";
  const steps = (r?.steps ?? []).filter((s) => s.seconds > 0.5);
  const totalTime = steps.reduce((s, x) => s + x.seconds, 0);
  const wake = useQuery({
    queryKey: ["cfd-wake", run.run_id],
    queryFn: () => getCfdWake(run.run_id),
    enabled: run.state === "succeeded" || r?.cd != null,
    staleTime: Infinity,
    retry: false,
  });
  const wakeMid = wake.data?.stations[1];

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric
          label="Cd"
          value={fmt(r?.cd)}
          hint={
            r?.cd_ci95
              ? `95% ${fmt(r.cd_ci95[0])}–${fmt(r.cd_ci95[1])}`
              : r?.cd_window_spread != null
                ? `± ${fmt(r.cd_window_spread, 4)} window`
                : undefined
          }
        />
        <Metric
          label="CdA"
          value={r?.cd != null ? fmt(r.cd * A * 1e4, 2) : "—"}
          unit="cm²"
          hint={`A ${fmt(A * 1e4, 1)} cm²`}
        />
        <Metric
          label="Drag"
          value={drag != null ? fmt(drag, 4) : "—"}
          unit="N"
          hint={`at ${fmt(U, 1)} m/s`}
        />
        <Metric label="Cl" value={fmt(r?.cl)} hint="+ = lift" />
        <Metric
          label="Pressure share"
          value={pressure + viscous > 0 ? fmt((pressure / (pressure + viscous)) * 100, 0) : "—"}
          unit="%"
          hint="of total drag"
        />
        <Metric
          label="Cells"
          value={r?.cells != null ? (r.cells / 1e3).toFixed(0) : "—"}
          unit="k"
          hint={r?.mesh_ok === false ? "mesh check failed" : "mesh ok"}
          tone={r?.mesh_ok === false ? "risk" : undefined}
        />
        <Metric
          label="Iterations"
          value={r?.iterations != null ? String(r.iterations) : "—"}
          hint={r?.converged_by_residuals ? "residuals converged" : "not converged"}
        />
        <Metric
          label="Status"
          value={accepted ? "Accepted" : (r?.acceptance ?? run.state)}
          tone={accepted ? "ok" : "risk"}
          hint={`${(totalTime / 60).toFixed(1)} min total`}
        />
      </div>

      {run.state === "succeeded" && (
        <CpProbe key={run.run_id} runId={run.run_id} lengthMm={1000 * run.manifest.car.length_m} />
      )}

      {!accepted && r?.reasons?.length ? (
        <div className="rounded-lg border border-risk/30 px-4 py-3 text-[12px]">
          <p className="mb-1 font-medium text-risk">Why this run is not accepted</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            {r.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Drag split"
          actions={<ProvenanceBadge value="simulated" />}
          description="Pressure drag vs skin friction, full car."
        >
          <DragSplit pressure={pressure} viscous={viscous} />
          <Caption>
            Pressure drag comes from shape; skin friction from surface area and finish.
          </Caption>
        </Panel>
        <Panel
          title="Drag by part"
          actions={<ProvenanceBadge value="simulated" />}
          description="Pressure and skin-friction drag per part; % of total."
        >
          {groups.length ? (
            <DragByPart forces={Object.fromEntries(groups)} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No per-part forces in this run.</p>
          )}
          <Caption>
            Fix the top bar first: a big blue share means shape, a big grey share means surface
            area.
          </Caption>
        </Panel>
        <Panel
          title="Wake drag cross-check"
          actions={<ProvenanceBadge value="simulated" />}
          description="Momentum and pressure lost in the wake, at three distances behind the car."
        >
          {wake.data && drag != null ? (
            <WakeDrag stations={wake.data.stations} surface={drag} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {wake.error ? wake.error.message : "Sampling the wake…"}
            </p>
          )}
          <Caption>
            {wakeMid && drag != null
              ? `Wake recovers ${((wakeMid.drag_n / drag) * 100).toFixed(0)}% of surface drag at 0.5 L. The ±15% band is a consistency check for this plane.`
              : "Independent check of the force integration."}
          </Caption>
        </Panel>
        {wake.data && (
          <Panel
            title="Wake loss map"
            actions={<ProvenanceBadge value="simulated" />}
            description={`Total-pressure loss ${wake.data.loss_map.x_over_L} L behind the car, looking forward.`}
          >
            <WakeLossMap
              y={wake.data.loss_map.y_mm}
              z={wake.data.loss_map.z_mm}
              loss={wake.data.loss_map.cpt_loss}
            />
            <Caption>
              Bright regions have greater total-pressure loss. Use Q surfaces to identify vortical
              structures.
            </Caption>
          </Panel>
        )}
        {wake.data && (
          <Panel
            title="Wake velocity deficit"
            actions={<ProvenanceBadge value="simulated" />}
            description="Streamwise speed deficit relative to the inlet."
          >
            <WakeLossMap
              y={wake.data.loss_map.y_mm}
              z={wake.data.loss_map.z_mm}
              loss={wake.data.loss_map.velocity_deficit}
              label="1 − Ux/U∞"
              signed
            />
            <Caption>
              Positive values indicate slower flow. Negative values indicate local acceleration.
            </Caption>
          </Panel>
        )}
        {run.state === "succeeded" && (
          <WakeComparison key={run.run_id} run={run} baseWake={wake.data} />
        )}
        <Panel
          title="Forces by part"
          actions={<ProvenanceBadge value="simulated" />}
          description="Drag and lift per part group (N)."
        >
          {groups.length ? (
            <GroupForces forces={Object.fromEntries(groups)} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No per-part forces in this run.</p>
          )}
          <Caption>The longest drag bar is the part to improve first.</Caption>
        </Panel>
        <Panel
          title="Cd across runs"
          actions={<ProvenanceBadge value="simulated" />}
          description="Every solved run; green = accepted, outlined = this run."
        >
          <RunsCd current={run.run_id} />
          <Caption>Only accepted runs count as evidence.</Caption>
        </Panel>
        {r?.cd != null && (
          <Panel
            title="Area vs Cd trade"
            actions={<ProvenanceBadge value="simulated" />}
            description="Points on one curve give the same drag."
          >
            <AreaTrade cd={r.cd} area={A} />
            <Caption>Shrink frontal area or Cd; moving below the solid line cuts drag.</Caption>
          </Panel>
        )}
        <Panel
          title="Compute time"
          actions={
            <ProvenanceBadge
              value="measured"
              title="Wall-clock timings recorded by the job runner"
            />
          }
          description="Wall-clock time per pipeline step."
        >
          {steps.length ? (
            <StepTimes steps={steps} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No step timings recorded.</p>
          )}
          <Caption>Meshing and solving dominate; warm starts cut solve time.</Caption>
        </Panel>
      </div>
    </div>
  );
}
