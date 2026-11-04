"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ScatterChart } from "echarts/charts";
import { ToolboxComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdvancedFields } from "@/components/ui/advanced-fields";
import { Metric, NumberField, Panel } from "@/components/ui/primitives";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { analyzePairedTimings, type PairedTimingResult } from "@/lib/api";

echarts.use([ScatterChart, ToolboxComponent]);
type Row = PairedTimingResult["rows"][number];
const columns: DataColumn<Row>[] = [
  { accessorKey: "pair_id", header: "Pair" },
  { accessorKey: "baseline_s", header: "Baseline (s)", meta: { numeric: true } },
  { accessorKey: "candidate_s", header: "Candidate (s)", meta: { numeric: true } },
  {
    accessorKey: "difference_ms",
    header: "Candidate − baseline (ms)",
    meta: { numeric: true },
    cell: (c) => Number(c.getValue()).toFixed(3),
  },
];

function DifferencePlot({ data }: { data: PairedTimingResult }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 62, right: 22, top: 38, bottom: 45 },
      toolbox: { feature: { saveAsImage: { type: "png", name: "paired-timing-differences" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "item",
        valueFormatter: (v: unknown) => `${Number(v).toFixed(3)} ms`,
      },
      xAxis: { type: "value", ...chartAxis(t), name: "pair row", minInterval: 1 },
      yAxis: { type: "value", ...chartAxis(t), name: "candidate − baseline (ms)", scale: true },
      series: [
        {
          type: "scatter",
          name: "Paired difference",
          symbolSize: 7,
          dimensions: ["Pair row", "Difference (ms)"],
          encode: { x: 0, y: 1, tooltip: [1] },
          data: data.rows.map((r, i) => [i + 1, r.difference_ms]),
          itemStyle: { color: t.brand },
          markLine: {
            symbol: "none",
            data: [
              { yAxis: 0, name: "No change" },
              { yAxis: data.mean_difference_ms, name: "Mean difference" },
            ],
            label: { position: "insideEndTop", formatter: "{b}", color: t.muted },
          },
          markArea: {
            silent: true,
            itemStyle: { color: t.brand, opacity: 0.12 },
            data: [[{ yAxis: data.ci_ms[0] }, { yAxis: data.ci_ms[1] }]],
          },
        },
      ],
    };
  }, [data]);
  return (
    <figure>
      <div
        ref={host}
        className="h-64 w-full"
        role="img"
        aria-label="Paired timing differences and confidence interval of their mean"
      />
      <figcaption className="text-xs text-muted-foreground">
        Dots are individual pairs. The shaded {(100 * (1 - data.alpha)).toFixed(1)}% interval
        describes the mean difference, not the spread of future runs. Negative means faster
        candidate.
      </figcaption>
    </figure>
  );
}

function download(data: PairedTimingResult) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "paired-timing-analysis.json";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PairedTimingPanel() {
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState("");
  const [basis, setBasis] = useState("");
  const [pairs, setPairs] = useState(20);
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [effect, setEffect] = useState(0);
  const comparison = useMutation({ mutationFn: analyzePairedTimings });
  const invalid =
    !csv.trim() ||
    !source.trim() ||
    basis.trim().length < 5 ||
    ![pairs, alpha, power, effect].every(Number.isFinite) ||
    !Number.isInteger(pairs) ||
    pairs < 3 ||
    pairs > 1000 ||
    alpha < 0.001 ||
    alpha > 0.1 ||
    power < 0.5 ||
    power > 0.99 ||
    effect < 0 ||
    effect > 10_000;
  return (
    <Panel
      title="Paired timing comparison"
      description="Matched baseline and candidate runs; every source row is retained."
      bodyClassName="space-y-4 p-4"
    >
      <p className="text-xs text-muted-foreground">
        Declare pairs before comparing. Match conditions and randomise or counterbalance order.
        Source times are user-entered and have not been independently verified.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid)
            comparison.mutate({
              csv_text: csv,
              source_label: source.trim(),
              pairing_basis: basis.trim(),
              planned_pairs: pairs,
              alpha,
              target_power: power,
              meaningful_effect_ms: effect > 0 ? effect : null,
            });
        }}
      >
        <fieldset disabled={comparison.isPending} className="space-y-3 disabled:opacity-60">
          <label htmlFor="paired-source" className="block space-y-1 text-xs">
            Source / session reference
            <Input
              id="paired-source"
              value={source}
              maxLength={150}
              onChange={(e) => {
                setSource(e.target.value);
                comparison.reset();
              }}
              required
            />
          </label>
          <label htmlFor="paired-basis" className="block space-y-1 text-xs">
            How the runs were paired
            <Input
              id="paired-basis"
              value={basis}
              minLength={5}
              maxLength={1000}
              onChange={(e) => {
                setBasis(e.target.value);
                comparison.reset();
              }}
              required
            />
          </label>
          <label className="block space-y-1 text-xs">
            Paired CSV (seconds)
            <textarea
              value={csv}
              maxLength={64000}
              onChange={(e) => {
                setCsv(e.target.value);
                comparison.reset();
              }}
              rows={7}
              className="w-full rounded-md border bg-background p-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-describedby="paired-csv-help"
              required
            />
          </label>
          <p id="paired-csv-help" className="text-xs text-muted-foreground">
            Exact header: <code>pair_id,baseline_s,candidate_s</code>. One unique pair per row,
            3–500 complete pairs; no automatic exclusions.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              id="paired-planned"
              label="Planned future pairs"
              unit="pairs"
              value={pairs}
              min={3}
              max={1000}
              step={1}
              onChange={(v) => {
                setPairs(v);
                comparison.reset();
              }}
            />
            <NumberField
              id="paired-effect"
              label="Meaningful difference (0 = skip)"
              unit="ms"
              value={effect}
              min={0}
              max={10_000}
              step={1}
              onChange={(v) => {
                setEffect(v);
                comparison.reset();
              }}
            />
          </div>
          <AdvancedFields
            description="Prospective two-sided power uses the pilot difference spread as an assumption."
            invalidCount={
              [
                alpha < 0.001 || alpha > 0.1 || !Number.isFinite(alpha),
                power < 0.5 || power > 0.99 || !Number.isFinite(power),
              ].filter(Boolean).length
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                id="paired-alpha"
                label="Two-sided significance level"
                unit="1"
                value={alpha}
                min={0.001}
                max={0.1}
                step={0.005}
                onChange={(v) => {
                  setAlpha(v);
                  comparison.reset();
                }}
              />
              <NumberField
                id="paired-power"
                label="Target planning power"
                unit="1"
                value={power}
                min={0.5}
                max={0.99}
                step={0.01}
                onChange={(v) => {
                  setPower(v);
                  comparison.reset();
                }}
              />
            </div>
          </AdvancedFields>
          <Button type="submit" disabled={invalid}>
            {comparison.isPending ? "Analysing and saving evidence…" : "Analyse and save evidence"}
          </Button>
        </fieldset>
      </form>
      {comparison.isError && (
        <p role="alert" className="text-sm text-destructive">
          {comparison.error.message}
        </p>
      )}
      {comparison.data && <PairedResult data={comparison.data} />}
    </Panel>
  );
}

function PairedResult({ data }: { data: PairedTimingResult }) {
  return (
    <section className="space-y-4" aria-label="Paired analysis result">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Mean difference" value={data.mean_difference_ms.toFixed(3)} unit="ms" />
        <Metric
          label="Mean CI"
          value={`${data.ci_ms[0].toFixed(3)} to ${data.ci_ms[1].toFixed(3)}`}
          unit="ms"
        />
        <Metric label="Two-sided p" value={data.p_two_sided.toPrecision(3)} unit="1" />
        <Metric
          label="Detectable effect"
          value={data.minimum_detectable_ms.toFixed(3)}
          unit="ms"
          hint={`${data.planned_pairs} future pairs, ${(data.target_power * 100).toFixed(0)}% power; pilot SD assumed`}
        />
        <Metric
          label="Required pairs"
          value={data.required_pairs == null ? "—" : String(data.required_pairs)}
          unit={data.required_pairs == null ? "" : "pairs"}
          hint={
            data.required_pairs == null
              ? data.required_pairs_status === "not_requested"
                ? "Enter a meaningful difference to solve for N"
                : data.required_pairs_status
              : `For ${data.meaningful_effect_ms} ms; N−1 reports ${(
                  (data.power_below_required ?? 0) * 100
                ).toFixed(0)}% power`
          }
        />
      </div>
      {data.required_pairs != null && data.power_below_required != null && (
        <p className="text-xs text-muted-foreground">
          {data.required_pairs} pairs reach {(100 * (data.power_at_required ?? 0)).toFixed(1)}%
          power; {data.required_pairs - 1} pairs reach only{" "}
          {(100 * data.power_below_required).toFixed(1)}%, so the solver returns the smallest N that
          meets the target.
        </p>
      )}
      <DifferencePlot data={data} />
      <DataTable data={data.rows} columns={columns} label="Source timing pairs" />
      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
        {data.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p className="break-all font-mono text-xs text-muted-foreground">
        Source: {data.source_artifact_id}
        <br />
        Result: {data.result_artifact_id}
      </p>
      <Button variant="outline" onClick={() => download(data)}>
        Download analysis JSON
      </Button>
    </section>
  );
}
