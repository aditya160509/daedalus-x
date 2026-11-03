"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ToolboxComponent } from "echarts/components";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { JobsDrawer } from "@/components/jobs/JobsDrawer";
import { Button } from "@/components/ui/button";
import {
  Panel,
  ProvenanceBadge,
  NumberField,
  SegmentedControl,
  Skeleton,
} from "@/components/ui/primitives";
import { AdvancedFields } from "@/components/ui/advanced-fields";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { SERIES_CYCLE } from "@/lib/colormap";
import {
  cancelJob,
  getOracleBenchmark,
  listOracleBenchmarks,
  submitOracleBenchmark,
  type OracleBenchmarkResult,
} from "@/lib/api";

echarts.use([ToolboxComponent]);
const METRICS = [
  { value: "regret", label: "Reference gap" },
  { value: "best", label: "Best CdA" },
] as const;
type Metric = (typeof METRICS)[number]["value"];
const live = (state: string) => state === "queued" || state === "running";
type Method = OracleBenchmarkResult["methods"][number];
type Evaluation = OracleBenchmarkResult["evaluations"][number];
const METHOD_COLUMNS: DataColumn<Method>[] = [
  { accessorKey: "label", header: "Method" },
  {
    id: "mean",
    accessorFn: (row) => row.mean_cda_m2.at(-1)! * 10000,
    header: "Final mean CdA (cm²)",
    meta: { numeric: true },
    cell: (context) => Number(context.getValue()).toFixed(4),
  },
  {
    id: "interval",
    header: "95% CI (cm²)",
    meta: { numeric: true },
    cell: ({ row }) =>
      `${(row.original.lower_cda_m2.at(-1)! * 10000).toFixed(4)}–${(row.original.upper_cda_m2.at(-1)! * 10000).toFixed(4)}`,
  },
];
const EVALUATION_COLUMNS: DataColumn<Evaluation>[] = [
  { accessorKey: "method", header: "Method" },
  { accessorKey: "seed", header: "Seed", meta: { numeric: true } },
  { accessorKey: "index", header: "Evaluation", meta: { numeric: true } },
  {
    accessorKey: "cda_m2",
    header: "CdA (cm²)",
    meta: { numeric: true },
    cell: (context) => (Number(context.getValue()) * 10000).toFixed(4),
  },
  { accessorKey: "reason", header: "Why chosen" },
];

function BenchmarkPlot({ result, metric }: { result: OracleBenchmarkResult; metric: Metric }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono, color: t.muted },
      grid: { left: 65, right: 20, top: 72, bottom: 45 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (value: unknown) =>
          typeof value === "number" ? `${value.toFixed(4)} cm²` : "—",
      },
      legend: {
        top: 4,
        left: 12,
        right: 45,
        data: result.methods.map((m) => m.label),
        textStyle: { color: t.text2, fontSize: 10 },
      },
      toolbox: {
        top: 2,
        right: 8,
        iconStyle: { borderColor: t.muted },
        feature: { saveAsImage: { type: "png", name: `oracle-${result.job_id}-${metric}` } },
      },
      xAxis: {
        type: "category",
        ...chartAxis(t),
        data: Array.from({ length: result.spec.budget }, (_, i) => i + 1),
        name: "evaluations / method",
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: {
        type: "value",
        ...chartAxis(t),
        scale: true,
        name: metric === "regret" ? "reference gap (cm²)" : "best CdA (cm²)",
      },
      series: result.methods.flatMap((method, index) => {
        const color = SERIES_CYCLE[index % SERIES_CYCLE.length];
        const mean = metric === "regret" ? method.mean_regret_m2 : method.mean_cda_m2;
        const lower = metric === "regret" ? method.lower_regret_m2 : method.lower_cda_m2;
        const upper = metric === "regret" ? method.upper_regret_m2 : method.upper_cda_m2;
        return [
          {
            type: "line",
            name: `${method.label} lower`,
            data: lower.map((x) => x * 10000),
            stack: method.id,
            symbol: "none",
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 },
            tooltip: { show: false },
            silent: true,
            step: "end",
          },
          {
            type: "line",
            name: `${method.label} 95% CI`,
            data: upper.map((x, i) => (x - lower[i]) * 10000),
            stack: method.id,
            symbol: "none",
            lineStyle: { opacity: 0 },
            areaStyle: { color, opacity: 0.1 },
            tooltip: { show: false },
            silent: true,
            step: "end",
          },
          {
            type: "line",
            name: method.label,
            data: mean.map((x) => x * 10000),
            symbol: "none",
            lineStyle: {
              color,
              width: index === 0 ? 2.5 : 1.5,
              type: index === 0 ? "solid" : "dashed",
            },
            itemStyle: { color },
            step: "end",
          },
        ];
      }),
    };
  }, [result, metric]);
  return (
    <div
      ref={host}
      className="h-80 w-full min-w-0 sm:h-96"
      role="img"
      aria-label="Equal-budget synthetic optimizer comparison with 95 percent confidence bands"
    />
  );
}

export function OptimizerBenchmark() {
  const cache = useQueryClient();
  const [selected, setSelected] = useState("");
  const [metric, setMetric] = useState<Metric>("regret");
  const [spec, setSpec] = useState({ budget: 20, n_init: 8, seeds: 10, seed: 7 });
  const [history, setHistory] = useState(false);
  const studies = useQuery({
    queryKey: ["oracle-benchmarks"],
    queryFn: listOracleBenchmarks,
    refetchInterval: (q) => (q.state.data?.some((j) => live(j.state)) ? 2000 : false),
  });
  const id = selected || studies.data?.[0]?.id || "";
  const detail = useQuery({
    queryKey: ["oracle-benchmark", id],
    queryFn: () => getOracleBenchmark(id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && live(q.state.data.job.state) ? 2000 : false),
  });
  const create = useMutation({
    mutationFn: submitOracleBenchmark,
    onSuccess: (answer) => {
      setSelected(answer.job.id);
      void cache.invalidateQueries({ queryKey: ["oracle-benchmarks"] });
      void cache.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
  const cancel = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["oracle-benchmarks"] });
      void cache.invalidateQueries({ queryKey: ["oracle-benchmark", id] });
    },
  });
  const active = studies.data?.some((job) => live(job.state));
  const valid =
    Number.isInteger(spec.budget) &&
    spec.budget >= 8 &&
    spec.budget <= 32 &&
    Number.isInteger(spec.n_init) &&
    spec.n_init >= 4 &&
    spec.n_init <= 12 &&
    spec.n_init < spec.budget &&
    Number.isInteger(spec.seeds) &&
    spec.seeds >= 10 &&
    spec.seeds <= 20 &&
    Number.isInteger(spec.seed) &&
    spec.seed >= 0 &&
    spec.seed <= 2147483647;
  const result = detail.data?.result;
  return (
    <Panel
      title="Optimiser benchmark"
      actions={<ProvenanceBadge value="synthetic" />}
      bodyClassName="overflow-y-auto p-4"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Compare ORACLE GP/EI, actual Optuna TPE/CMA-ES and SciPy Sobol/LHS/random at identical
          evaluation budgets. This tests a synthetic function, not the car or accepted CFD. The
          protocol is stored before the job is queued.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            Saved study
            <select
              aria-label="Benchmark study"
              value={id}
              onChange={(e) => setSelected(e.target.value)}
              className="h-8 max-w-full rounded-md border bg-background px-2 font-mono text-xs"
            >
              {!studies.data?.length && <option value="">No benchmark studies</option>}
              {studies.data?.map((job) => (
                <option value={job.id} key={job.id}>
                  {job.created_at.slice(0, 16).replace("T", " ")} · {job.state}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            disabled={!valid || create.isPending || active || studies.isPending || studies.isError}
            onClick={() => create.mutate(spec)}
          >
            {create.isPending ? "Registering…" : "Register and queue"}
          </Button>
          {detail.data && live(detail.data.job.state) && (
            <Button
              size="sm"
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(id)}
            >
              Cancel job
            </Button>
          )}
          <JobsDrawer />
        </div>
        <AdvancedFields
          description="Every startup evaluation counts toward the total. Each seed is an independent campaign; all six methods receive the same total budget."
          invalidCount={valid ? 0 : 1}
          disabled={create.isPending}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              id="bench-budget"
              label="Budget / method"
              unit="evaluations"
              min={8}
              max={32}
              step={1}
              value={spec.budget}
              onChange={(budget) => setSpec((s) => ({ ...s, budget }))}
            />
            <NumberField
              id="bench-init"
              label="Adaptive startup"
              unit="evaluations"
              min={4}
              max={12}
              step={1}
              value={spec.n_init}
              onChange={(n_init) => setSpec((s) => ({ ...s, n_init }))}
            />
            <NumberField
              id="bench-seeds"
              label="Independent seeds"
              unit="seeds"
              min={10}
              max={20}
              step={1}
              value={spec.seeds}
              onChange={(seeds) => setSpec((s) => ({ ...s, seeds }))}
            />
            <NumberField
              id="bench-seed"
              label="First seed"
              unit="1"
              min={0}
              max={2147483647}
              step={1}
              value={spec.seed}
              onChange={(seed) => setSpec((s) => ({ ...s, seed }))}
            />
          </div>
          {!valid && (
            <p role="alert" className="text-xs text-destructive">
              Use integer settings within the bounds, with startup less than total budget.
            </p>
          )}
        </AdvancedFields>
        {Object.entries({
          list: studies.error,
          detail: detail.error,
          create: create.error,
          cancel: cancel.error,
        })
          .filter(([, error]) => Boolean(error))
          .map(([source, error]) => (
            <p role="alert" className="text-sm text-destructive" key={source}>
              {error?.message}
            </p>
          ))}
        {studies.isPending || (detail.isFetching && !detail.data) ? (
          <Skeleton className="h-80" />
        ) : !id ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No preregistered study yet. Register a protocol, then run the existing jobs worker when
            the machine is available. Nothing launches merely by opening this page.
          </p>
        ) : (
          detail.data && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {detail.data.job.state} · protocol{" "}
                  <span className="break-all font-mono">{detail.data.protocol_id}</span>
                </span>
                <a
                  href={`/api/v1/oracle/benchmarks/${encodeURIComponent(id)}`}
                  download={`oracle-${id}.json`}
                  className="underline underline-offset-4"
                >
                  Export evidence JSON
                </a>
              </div>
              {live(detail.data.job.state) && (
                <p role="status" className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {detail.data.job.state === "queued"
                    ? "Waiting for the existing worker. Benchmark and CFD work are serialized; no solver is launched by this benchmark."
                    : "Evaluating synthetic objectives in the worker; logs and cancellation are available in Jobs."}
                </p>
              )}
              {detail.data.job.error && (
                <p role="alert" className="text-sm text-destructive">
                  {detail.data.job.error}
                </p>
              )}
              {result && (
                <>
                  <SegmentedControl
                    options={METRICS}
                    value={metric}
                    onChange={setMetric}
                    label="Benchmark metric"
                  />
                  <BenchmarkPlot result={result} metric={metric} />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Lower is better. Shading is the 95% confidence interval of the mean over{" "}
                    {result.spec.seeds} seeds; it is not a prediction interval. Reference gap uses a
                    numerical, uncertified minimum. {result.spec.budget} evaluations per method,
                    including startup; zero CFD runs.
                  </p>
                  <DataTable
                    data={result.methods}
                    columns={METHOD_COLUMNS}
                    label="Benchmark final means and confidence intervals"
                  />
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {result.assumptions.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={history}
                    onClick={() => setHistory((x) => !x)}
                  >
                    {history ? "Hide" : "Show"} acquisition history
                  </Button>
                  {history && (
                    <div className="space-y-2">
                      <DataTable
                        data={result.evaluations.slice(-200)}
                        columns={EVALUATION_COLUMNS}
                        label="Benchmark acquisition history"
                      />
                      <p className="text-xs text-muted-foreground">
                        Latest 200 evaluations shown; complete points and reasons are in the
                        evidence JSON.
                      </p>
                    </div>
                  )}
                </>
              )}
              <AdvancedFields description="Exact code/dependency identities stored before execution.">
                <dl className="space-y-2 text-xs">
                  {Object.entries(detail.data.protocol.implementation).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="break-all font-mono">{value}</dd>
                    </div>
                  ))}
                </dl>
              </AdvancedFields>
            </>
          )
        )}
      </div>
    </Panel>
  );
}
