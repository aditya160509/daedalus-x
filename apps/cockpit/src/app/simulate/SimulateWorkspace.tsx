"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDashed, Wind, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { JobsDrawer } from "@/components/jobs/JobsDrawer";
import { NewRunDialog } from "@/components/jobs/NewRunDialog";
import { ForceBars } from "@/components/charts/ForceBars";
import { HistoryChart } from "@/components/charts/HistoryChart";
import { EmptyState, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { type CfdRunDetail, getCfdRun, listCfdRuns } from "@/lib/api";
import { SERIES, SERIES_CYCLE } from "@/lib/colormap";
import { useSelectedRun } from "@/lib/runSelection";
import { cn } from "@/lib/utils";
import { RenderPanel } from "@/components/render/HeroRender";
import { GridStudyPanel } from "./GridStudyPanel";
import { StatusBar, useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";

const TUNNEL_TABS = [
  { id: "flow", label: "Flow" },
  { id: "render", label: "Render" },
  { id: "forces", label: "Forces" },
  { id: "convergence", label: "Convergence" },
  { id: "mesh", label: "Mesh" },
] as const;

// vtk.js is heavy: load it only when the 3D Flow tab opens.
const FlowViewer3D = dynamic(() => import("./FlowViewer3D").then((m) => m.FlowViewer3D), {
  ssr: false,
  loading: () => <p className="p-4 text-xs text-muted-foreground">Loading 3D viewer…</p>,
});

const RHO = 1.204; // kg/m³, matches the case template
const CD_WINDOW = 200; // iterations used by the acceptance gate

const fmt = (v: number | null | undefined, digits = 4) =>
  v == null || !Number.isFinite(v) ? "—" : v.toPrecision(digits);

export function SimulateWorkspace() {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, refetchInterval: 15_000 });
  const [picked] = useSelectedRun();
  const runId =
    (picked && runs.data?.some((r) => r.run_id === picked) ? picked : null) ??
    runs.data?.find((r) => r.state === "succeeded" && r.has_viz)?.run_id ??
    runs.data?.[0]?.run_id ??
    null;
  const detail = useQuery({
    queryKey: ["cfd-run", runId],
    queryFn: () => (runId ? getCfdRun(runId) : Promise.reject(new Error("no run selected"))),
    enabled: runId != null,
    refetchInterval: (q) => (q.state.data?.state === "running" ? 10_000 : false),
  });

  if (runs.isError)
    return (
      <EmptyState icon={<AlertTriangle />} title="API unreachable">
        Start the API with <code className="font-mono">uv run daedalus-api</code>.
      </EmptyState>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="text-xs text-muted-foreground">simpleFoam · k-ω SST · moving ground</span>
        <div className="ml-auto flex items-center gap-2">
          <NewRunDialog />
          <JobsDrawer />
        </div>
      </header>
      {runs.data?.length === 0 ? (
        <EmptyState icon={<Wind />} title="No CFD runs yet">
          Import a design, then use New run to queue an approved case.
        </EmptyState>
      ) : detail.data ? (
        <RunView
          run={detail.data}
          hasViz={runs.data?.find((r) => r.run_id === runId)?.has_viz ?? false}
        />
      ) : (
        <div className="flex-1 animate-pulse rounded-xl bg-surface-2" />
      )}
    </div>
  );
}

function RunView({ run, hasViz }: { run: CfdRunDetail; hasViz: boolean }) {
  const [tab, setTab] = useTab(TUNNEL_TABS);
  const { manifest, result, coefficients, residuals } = run;
  const U = manifest.reference.U_m_s;
  const A = manifest.reference.Aref_full_m2;
  const q = 0.5 * RHO * U * U;

  // While running, read the live Cd from the coefficient history (full-car Cd is
  // invariant to the half-model doubling because both force and Aref are halved).
  const cdSeries = useMemo(() => coefficients?.values.Cd ?? [], [coefficients]);
  const clSeries = coefficients?.values.Cl ?? [];
  const cd = result?.cd ?? cdSeries.at(-1) ?? null;
  const cl = result?.cl ?? clSeries.at(-1) ?? null;
  const iteration = result?.iterations ?? coefficients?.iteration.at(-1) ?? null;
  const maxIter = Number(manifest.config.max_iterations ?? NaN);

  const forces = useMemo(
    () =>
      Object.entries(result?.forces_n ?? {}).map(([name, f]) => ({
        name: name.replace("_", " "),
        pressure: f.pressure_drag_x,
        viscous: f.viscous_drag_x,
      })),
    [result],
  );
  const cdHistory = useMemo(
    () => [{ name: "Cd", values: cdSeries, color: SERIES.cyan }],
    [cdSeries],
  );
  const residualHistory = useMemo(
    () =>
      Object.entries(residuals?.values ?? {}).map(([k, v], i) => ({
        name: k.replace("_initial", ""),
        values: v,
        color: SERIES_CYCLE[i % SERIES_CYCLE.length],
      })),
    [residuals],
  );
  // Scale the Cd axis to the settled second half so oscillation is visible, not the transient.
  const cdRange = useMemo((): [number, number] | undefined => {
    const tail = cdSeries.slice(Math.floor(cdSeries.length / 2)).filter(Number.isFinite);
    if (tail.length < 2) return undefined;
    const lo = Math.min(...tail);
    const hi = Math.max(...tail);
    const pad = Math.max((hi - lo) * 0.25, Math.abs(hi) * 0.005);
    return [+(lo - pad).toPrecision(3), +(hi + pad).toPrecision(3)];
  }, [cdSeries]);
  const band = useMemo(() => {
    const last = coefficients?.iteration.at(-1);
    return last && last > CD_WINDOW
      ? { from: last - CD_WINDOW, label: `acceptance window · ${CD_WINDOW} it` }
      : undefined;
  }, [coefficients]);

  const status = [
    { label: "Cd", value: fmt(cd) },
    { label: "CdA", value: cd == null ? "—" : `${(cd * A * 1e4).toFixed(2)} cm²` },
    { label: "Drag", value: cd == null ? "—" : `${(cd * q * A).toFixed(3)} N` },
    { label: "Cl", value: fmt(cl) },
    { label: "Cells", value: result?.cells != null ? result.cells.toLocaleString() : "—" },
    {
      label: "Iter",
      value:
        iteration == null ? "—" : `${iteration}${Number.isFinite(maxIter) ? ` / ${maxIter}` : ""}`,
    },
    {
      label: "Status",
      value: result?.acceptance.replace("_", " ") ?? run.state,
      tone:
        result?.acceptance === "rejected"
          ? ("risk" as const)
          : result
            ? ("ok" as const)
            : undefined,
    },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTabs tabs={TUNNEL_TABS} value={tab} onChange={setTab} />
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {tab === "flow" &&
          (hasViz ? (
            <div className="min-h-0 min-w-0 flex-1">
              <FlowViewer3D runId={run.run_id} />
            </div>
          ) : (
            <EmptyState icon={<Wind className="size-5" />} title="No flow field for this run">
              Pick a solved run with flow data.
            </EmptyState>
          ))}
        {tab === "render" && (
          <div className="min-h-0 min-w-0 flex-1">
            <RenderPanel runId={run.run_id} />
          </div>
        )}
        {tab === "forces" && (
          <>
            <Panel
              title="Drag by component"
              description="Full-car drag split into pressure and skin friction."
              className="min-h-0 flex-1"
            >
              {forces.length ? <ForceBars data={forces} unit="N" /> : <Waiting />}
            </Panel>
            <Panel title="Acceptance" className="w-[360px] shrink-0" bodyClassName="p-4">
              <Acceptance run={run} />
            </Panel>
          </>
        )}
        {tab === "convergence" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <Panel
              title="Drag convergence"
              description="Cd per iteration, axis fitted to the settled half (scroll to zoom). Accepted only if Cd varies under 1% in the shaded window."
              className="min-h-0 flex-1"
              actions={<ProvenanceBadge value="simulated" />}
            >
              {cdSeries.length > 1 && coefficients ? (
                <HistoryChart
                  iteration={coefficients.iteration}
                  series={cdHistory}
                  yLabel="Cd"
                  band={band}
                  yRange={cdRange}
                  ariaLabel="Drag coefficient against iteration"
                />
              ) : (
                <Waiting />
              )}
            </Panel>
            <Panel
              title="Residuals"
              description="Initial residual per field, log scale."
              className="min-h-0 flex-1"
            >
              {residuals && residuals.iteration.length > 1 ? (
                <HistoryChart
                  iteration={residuals.iteration}
                  series={residualHistory}
                  yLabel="initial residual"
                  log
                  ariaLabel="Solver residuals against iteration"
                />
              ) : (
                <Waiting />
              )}
            </Panel>
          </div>
        )}
        {tab === "mesh" && (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
              <GridStudyPanel />
              <Panel
                title="Case assumptions"
                className="min-h-0 flex-1 overflow-y-auto"
                bodyClassName="p-4"
              >
                <ul className="space-y-1.5 text-sm text-text-2">
                  {manifest.assumptions.map((a) => (
                    <li key={a} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                      {a}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
            <Panel title="Pipeline" className="w-[360px] shrink-0" bodyClassName="p-0">
              <ol className="divide-y text-sm">
                {(result?.steps ?? []).map((s) => (
                  <li key={s.name} className="flex items-center gap-3 px-4 py-2">
                    {s.returncode === 0 ? (
                      <CheckCircle2 className="size-4 text-ok" />
                    ) : (
                      <XCircle className="size-4 text-danger" />
                    )}
                    <span className="font-mono text-xs">{s.name}</span>
                    <span className="tabular ml-auto text-xs text-muted-foreground">
                      {s.seconds.toFixed(1)} s
                    </span>
                  </li>
                ))}
                {!result && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">Solver still running.</li>
                )}
              </ol>
            </Panel>
          </>
        )}
      </div>
      <StatusBar items={status} />
    </div>
  );
}

function Acceptance({ run }: { run: CfdRunDetail }) {
  const r = run.result;
  if (!r || run.state === "running")
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleDashed className="size-4 animate-spin" /> Evaluated when the solver finishes.
      </p>
    );
  const rejected = r.acceptance === "rejected";
  const checks: Array<[string, boolean | null, string]> = [
    ["Mesh quality", r.mesh_ok, r.mesh_failures.join("; ") || "checkMesh passed"],
    [
      "Cd stable",
      r.cd_window_spread != null ? r.cd_window_spread <= 0.01 : null,
      r.cd_window_spread != null ? `spread ${(r.cd_window_spread * 100).toFixed(2)}%` : "—",
    ],
    [
      "Force sum",
      r.force_sum_check.relative_difference != null
        ? r.force_sum_check.relative_difference <= 1e-3
        : null,
      r.force_sum_check.relative_difference != null
        ? `Δ ${(r.force_sum_check.relative_difference * 100).toExponential(1)}%`
        : "—",
    ],
    ["Residual convergence", r.converged_by_residuals, r.converged_by_residuals ? "yes" : "no"],
  ];
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
          rejected ? "border-danger/40 text-danger" : "border-ok/40 text-ok",
        )}
      >
        {rejected ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
        {r.acceptance.replace("_", " ")}
      </div>
      <ul className="space-y-2 text-sm">
        {checks.map(([name, ok, detail]) => (
          <li key={name} className="flex items-center gap-2">
            {ok == null ? (
              <CircleDashed className="size-4 text-muted-foreground" />
            ) : ok ? (
              <CheckCircle2 className="size-4 text-ok" />
            ) : (
              <XCircle className="size-4 text-danger" />
            )}
            <span>{name}</span>
            <span className="ml-auto truncate text-xs text-muted-foreground">{detail}</span>
          </li>
        ))}
      </ul>
      {r.reasons.length > 0 && (
        <ul className="space-y-1 border-t pt-3 text-xs text-text-2">
          {r.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Waiting() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data yet
    </div>
  );
}
