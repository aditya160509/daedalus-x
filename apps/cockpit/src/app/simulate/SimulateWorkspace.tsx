"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDashed, Wind, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ForceBars } from "@/components/charts/ForceBars";
import { HistoryChart } from "@/components/charts/HistoryChart";
import { EmptyState, Metric, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { type CfdRunDetail, getCfdRun, listCfdRuns } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FlowPanel } from "./FlowPanel";

const RHO = 1.204; // kg/m³, matches the case template
const CD_WINDOW = 200; // iterations used by the acceptance gate

const fmt = (v: number | null | undefined, digits = 4) =>
  v == null || !Number.isFinite(v) ? "—" : v.toPrecision(digits);

export function SimulateWorkspace() {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, refetchInterval: 15_000 });
  const [picked, setPicked] = useState<string | null>(null);
  const runId = picked ?? runs.data?.[0]?.run_id ?? null;
  const detail = useQuery({
    queryKey: ["cfd-run", runId],
    queryFn: () => getCfdRun(runId as string),
    enabled: runId != null,
    refetchInterval: (q) => (q.state.data?.state === "running" ? 10_000 : false),
  });

  if (runs.isError)
    return (
      <EmptyState icon={<AlertTriangle />} title="API unreachable">
        Start the API with <code className="font-mono">uv run daedalus-api</code>.
      </EmptyState>
    );
  if (runs.data && runs.data.length === 0)
    return (
      <EmptyState icon={<Wind />} title="No CFD runs yet">
        Run <code className="font-mono">daedalus cfd run DESIGN CASE</code> to populate the wind
        tunnel.
      </EmptyState>
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold tracking-tight">Virtual wind tunnel</h1>
          <p className="text-sm text-muted-foreground">
            OpenFOAM simpleFoam · k-ω SST · half model with moving ground
          </p>
        </div>
        <div role="tablist" aria-label="CFD runs" className="flex flex-wrap gap-1.5">
          {runs.data?.map((r) => (
            <button
              key={r.run_id}
              role="tab"
              aria-selected={r.run_id === runId}
              onClick={() => setPicked(r.run_id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                r.run_id === runId
                  ? "border-brand/50 bg-brand/10 text-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <StateDot state={r.state} />
              <span className="font-mono">{r.run_id}</span>
              <span className="tabular text-muted-foreground">{r.speed_m_s} m/s</span>
            </button>
          ))}
        </div>
      </header>
      {detail.data ? (
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

function StateDot({ state }: { state: "running" | "succeeded" | "failed" }) {
  return (
    <span
      aria-label={state}
      className={cn(
        "size-1.5 rounded-full",
        state === "running" && "animate-pulse bg-brand",
        state === "succeeded" && "bg-ok",
        state === "failed" && "bg-danger",
      )}
    />
  );
}

function RunView({ run, hasViz }: { run: CfdRunDetail; hasViz: boolean }) {
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
  const cdHistory = useMemo(() => [{ name: "Cd", values: cdSeries, color: "#3dd6f0" }], [cdSeries]);
  const residualHistory = useMemo(
    () =>
      Object.entries(residuals?.values ?? {}).map(([k, v], i) => ({
        name: k.replace("_initial", ""),
        values: v,
        color: ["#5aa8ff", "#3dd6f0", "#b18cff", "#f5a524", "#7ee787", "#ff7b72"][i % 6],
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

  return (
    <div className="grid min-h-0 flex-1 auto-rows-min gap-4 overflow-y-auto lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 lg:col-span-12">
        <Metric label="Cd" value={fmt(cd)} provenance="simulated" />
        <Metric
          label="CdA"
          value={cd == null ? "—" : (cd * A * 1e4).toFixed(2)}
          unit="cm²"
          provenance="simulated"
        />
        <Metric
          label="Drag"
          value={cd == null ? "—" : (cd * q * A).toFixed(3)}
          unit="N"
          provenance="simulated"
          hint={`q = ${q.toFixed(0)} Pa, Aref = ${(A * 1e4).toFixed(2)} cm²`}
        />
        <Metric label="Cl" value={fmt(cl)} provenance="simulated" />
        <Metric
          label="Mesh cells"
          value={result?.cells != null ? result.cells.toLocaleString() : "—"}
        />
        <Metric
          label="Iterations"
          value={iteration == null ? "—" : String(iteration)}
          unit={Number.isFinite(maxIter) ? `/ ${maxIter}` : undefined}
        />
      </div>

      <Panel
        title="Drag convergence"
        description="Cd per iteration, axis fitted to the settled half (scroll to zoom). Accepted only if Cd varies under 1% in the shaded window."
        className="h-80 lg:col-span-7"
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
        className="h-80 lg:col-span-5"
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

      <Panel
        title="Drag by component"
        description="Full-car drag split into pressure and skin friction."
        className="h-72 lg:col-span-7"
      >
        {forces.length ? <ForceBars data={forces} unit="N" /> : <Waiting />}
      </Panel>

      <Panel title="Acceptance" className="lg:col-span-5" bodyClassName="p-4">
        <Acceptance run={run} />
      </Panel>

      <Panel title="Case assumptions" className="lg:col-span-7" bodyClassName="p-4">
        <ul className="space-y-1.5 text-sm text-text-2">
          {manifest.assumptions.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
              {a}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Pipeline" className="lg:col-span-5" bodyClassName="p-0">
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

      <FlowPanel runId={run.run_id} hasViz={hasViz} />
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
