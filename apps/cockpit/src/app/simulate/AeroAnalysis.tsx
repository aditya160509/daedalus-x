"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, ScatterChart } from "echarts/charts";
import { Panel } from "@/components/ui/primitives";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { type CfdRunDetail, listCfdRuns } from "@/lib/api";
import { cn } from "@/lib/utils";

echarts.use([PieChart, ScatterChart]);

const RHO = 1.204;

function fmt(v: number | null | undefined, d = 3) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);
}

function Kpi({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "ok" | "risk";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular font-mono text-2xl leading-none font-medium tracking-[-0.03em]",
            tone === "ok" && "text-ok",
            tone === "risk" && "text-risk",
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-muted-foreground">{unit}</span>}
      </div>
      <span className="truncate font-mono text-[11px] text-text-3">{sub ?? " "}</span>
    </div>
  );
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
      legend: { bottom: 0, icon: "roundRect", itemWidth: 10, itemHeight: 6, textStyle: { color: t.text2, fontSize: 11 } },
      series: [
        {
          type: "pie",
          radius: ["58%", "80%"],
          center: ["50%", "46%"],
          itemStyle: { borderColor: "transparent" },
          label: { show: true, position: "center", color: t.text, fontFamily: t.mono, fontSize: 18, formatter: () => `${((Math.max(pressure, 0) / Math.max(pressure + viscous, 1e-12)) * 100).toFixed(0)}%
pressure` },
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
      legend: { top: 0, right: 40, itemWidth: 12, itemHeight: 6, textStyle: { color: t.text2, fontSize: 11 } },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "area-trade" } } },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      xAxis: { type: "value", name: "A cm²", min: "dataMin", nameTextStyle: { color: t.muted, fontSize: 10 }, ...chartAxis(t) },
      yAxis: { type: "value", name: "Cd", scale: true, nameTextStyle: { color: t.muted, fontSize: 10 }, ...chartAxis(t) },
      series: [
        iso(0.9, "−10% drag", t.ok),
        iso(1, "This run", t.text2),
        iso(1.1, "+10% drag", t.risk),
        { name: "Run", type: "scatter", symbolSize: 9, itemStyle: { color: t.brand }, data: [[area * 1e4, cd]] },
      ],
    };
  }, [cd, area]);
  return <div ref={host} className="h-64 w-full" />;
}

/** Every aerodynamic output for the selected run on one page. */
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

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi
          label="Cd"
          value={fmt(r?.cd)}
          sub={
            r?.cd_ci95
              ? `95% ${fmt(r.cd_ci95[0])}–${fmt(r.cd_ci95[1])}`
              : r?.cd_window_spread != null
                ? `± ${fmt(r.cd_window_spread, 4)} window`
                : undefined
          }
        />
        <Kpi
          label="CdA"
          value={r?.cd != null ? fmt(r.cd * A * 1e4, 2) : "—"}
          unit="cm²"
          sub={`A ${fmt(A * 1e4, 1)} cm²`}
        />
        <Kpi
          label="Drag"
          value={drag != null ? fmt(drag, 4) : "—"}
          unit="N"
          sub={`at ${fmt(U, 1)} m/s`}
        />
        <Kpi label="Cl" value={fmt(r?.cl)} sub="+ = lift" />
        <Kpi
          label="Pressure share"
          value={pressure + viscous > 0 ? fmt((pressure / (pressure + viscous)) * 100, 0) : "—"}
          unit="%"
          sub="of total drag"
        />
        <Kpi
          label="Cells"
          value={r?.cells != null ? (r.cells / 1e3).toFixed(0) : "—"}
          unit="k"
          sub={r?.mesh_ok === false ? "mesh check failed" : "mesh ok"}
          tone={r?.mesh_ok === false ? "risk" : undefined}
        />
        <Kpi
          label="Iterations"
          value={r?.iterations != null ? String(r.iterations) : "—"}
          sub={r?.converged_by_residuals ? "residuals converged" : "not converged"}
        />
        <Kpi
          label="Status"
          value={accepted ? "Accepted" : (r?.acceptance ?? run.state)}
          tone={accepted ? "ok" : "risk"}
          sub={`${(totalTime / 60).toFixed(1)} min total`}
        />
      </div>

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
        <Panel title="Drag split" description="Pressure drag vs skin friction, full car.">
          <DragSplit pressure={pressure} viscous={viscous} />
          <Caption>
            Pressure drag comes from shape; skin friction from surface area and finish.
          </Caption>
        </Panel>
        <Panel title="Forces by part" description="Drag and lift per part group (N).">
          {groups.length ? (
            <GroupForces forces={Object.fromEntries(groups)} />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No per-part forces in this run.</p>
          )}
          <Caption>The longest drag bar is the part to improve first.</Caption>
        </Panel>
        <Panel
          title="Cd across runs"
          description="Every solved run; green = accepted, outlined = this run."
        >
          <RunsCd current={run.run_id} />
          <Caption>Only accepted runs count as evidence.</Caption>
        </Panel>
        {r?.cd != null && (
          <Panel title="Area vs Cd trade" description="Points on one curve give the same drag.">
            <AreaTrade cd={r.cd} area={A} />
            <Caption>Shrink frontal area or Cd; moving below the solid line cuts drag.</Caption>
          </Panel>
        )}
        <Panel title="Compute time" description="Wall-clock time per pipeline step.">
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
