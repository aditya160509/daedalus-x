"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { cadFocusHref } from "@/lib/cadFocus";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  forgeSheetUrl,
  forgeSummaryUrl,
  getForgeChecks,
  getForgeRisk,
  listDesigns,
  measureForge,
  type ForgeRisk,
  type RuleCheck,
} from "@/lib/api";
import { chartTheme, useECharts } from "@/components/charts/useECharts";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { NumberField, Panel, Skeleton } from "@/components/ui/primitives";
import { fmt, fmtPct } from "@/lib/format";
import { headroomLabel, normalisedHeadroom } from "@/lib/forgeMargin";
import { cn } from "@/lib/utils";

const STATE: Record<RuleCheck["state"], { label: string; dot: string }> = {
  fail_cad: { label: "Fail", dot: "bg-destructive" },
  at_risk: { label: "Risk", dot: "bg-risk" },
  pass_cad_only: { label: "Pass", dot: "bg-ok" },
  manual_review: { label: "Measure", dot: "bg-line-strong" },
};
const ORDER: RuleCheck["state"][] = ["fail_cad", "at_risk", "manual_review", "pass_cad_only"];

const limit = (c: RuleCheck) =>
  c.min != null && c.max != null
    ? `${c.min}–${c.max}`
    : c.min != null
      ? `≥ ${c.min}`
      : c.max != null
        ? `≤ ${c.max}`
        : "Manual check";

type RiskRow = ForgeRisk["rules"][number];

const RISK_COLUMNS: DataColumn<RiskRow>[] = [
  {
    accessorKey: "rule_id",
    header: "Rule",
    cell: (cell) => (
      <span>
        <span className="font-mono text-muted-foreground">{String(cell.getValue())}</span>{" "}
        {cell.row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "pass_probability",
    header: "Pass probability",
    meta: { numeric: true },
    cell: (cell) => `${(Number(cell.getValue()) * 100).toFixed(1)}%`,
  },
  {
    accessorKey: "sigma",
    header: "Assumed σ",
    meta: { numeric: true },
    cell: (cell) => `${Number(cell.getValue()).toFixed(3)} ${cell.row.original.unit}`,
  },
  {
    accessorKey: "expected_points_lost",
    header: "Expected loss (pts)",
    meta: { numeric: true },
    cell: (cell) => {
      const value = cell.getValue();
      return typeof value === "number" ? fmt(value, 2) : "not quantified";
    },
  },
];

function RuleRiskChart({ risk }: { risk: ForgeRisk }) {
  const rows = risk.rules.toSorted((a, b) => a.pass_probability - b.pass_probability);
  const host = useECharts(() => {
    const theme = chartTheme();
    return {
      animation: false,
      grid: { left: 54, right: 16, top: 30, bottom: 64, containLabel: false },
      toolbox: {
        right: 0,
        top: 0,
        feature: {
          saveAsImage: { type: "png", name: "forge-rule-pass-probability", pixelRatio: 2 },
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme.popover,
        borderColor: theme.lineStrong,
        textStyle: { color: theme.text, fontSize: 11, fontFamily: theme.mono },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const row = rows[params[0]?.dataIndex ?? 0];
          if (!row) return "";
          return [
            `${row.rule_id} · ${row.name}`,
            `Pass ${(row.pass_probability * 100).toFixed(1)}% at assumed σ ${row.sigma.toFixed(3)} ${row.unit}`,
            row.expected_points_lost == null
              ? "Expected loss not quantified from the penalty text"
              : `Expected loss ${row.expected_points_lost.toFixed(2)} pts`,
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "category",
        data: rows.map((row) => row.rule_id),
        axisLabel: { color: theme.muted, fontSize: 9, rotate: 40, interval: 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.line } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        name: "pass probability (%)",
        nameTextStyle: { color: theme.muted, fontSize: 10 },
        axisLabel: { color: theme.muted, fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { color: theme.line, opacity: 0.5 } },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 18,
          data: rows.map((row) => ({
            value: row.pass_probability * 100,
            itemStyle: {
              color:
                row.pass_probability < 0.8
                  ? theme.risk
                  : row.pass_probability < 0.95
                    ? theme.brand
                    : theme.ok,
            },
          })),
        },
      ],
    };
  }, [risk]);
  return (
    <div
      ref={host}
      className="w-full"
      role="img"
      aria-label="Per-rule manufacturing pass probability, weakest rule first"
      style={{ height: Math.max(240, Math.min(520, rows.length * 18 + 110)) }}
    />
  );
}

function RuleRiskDetail({ risk }: { risk: ForgeRisk }) {
  const rows = risk.rules.toSorted((a, b) => a.pass_probability - b.pass_probability);
  const weakest = rows[0];
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-2xs">
        <span className="font-medium text-text-2">Weakest calculated rule</span>
        {weakest && (
          <span className="tabular font-mono">
            {weakest.rule_id} · {fmtPct(weakest.pass_probability, 1)}% at σ{" "}
            {weakest.sigma.toFixed(3)} {weakest.unit}
          </span>
        )}
      </div>
      <RuleRiskChart risk={risk} />
      <DataTable
        data={rows}
        columns={RISK_COLUMNS}
        label="Per-rule manufacturing pass probabilities"
        empty="No rule had a CAD value and an applicable sigma."
      />
      <p className="text-2xs leading-4 text-muted-foreground">
        Sorted weakest first. {risk.excluded_rules} manual or non-length rule(s) excluded from this
        model; they are not shown as 100% passing or zero penalty.
        {risk.unquantified_rules.length > 0 &&
          ` Expected loss is unavailable for ${risk.unquantified_rules.length} rule(s) whose penalty text does not state points: ${risk.unquantified_rules.join(", ")}.`}{" "}
        σ is a declared process assumption, not measured manufacturing capability.
      </p>
      <details className="text-2xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Model assumptions</summary>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {risk.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** FORGE: CAD-only rule checks with margins; non-computable rules stay "Measure", never green. */
export function LegalPanel({
  design: picked,
  onFocus,
}: { design?: string; onFocus?: (parts: string[]) => void } = {}) {
  const router = useRouter();
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  const design = picked ?? designs.data?.[0]?.design_id;
  const [sigma, setSigma] = useState(0.05);
  const riskSigma = useDeferredValue(Number.isFinite(sigma) && sigma > 0 ? sigma : 0.05);
  const q = useQuery({
    queryKey: ["forge", design],
    queryFn: () => getForgeChecks(design!),
    enabled: !!design,
  });
  const risk = useQuery({
    queryKey: ["forge-risk", design, riskSigma],
    queryFn: () => getForgeRisk(design!, riskSigma),
    enabled: !!design && !!q.data,
    staleTime: 30_000,
  });
  const measurement = useMutation({
    mutationFn: () => measureForge(design!),
    onSuccess: async (result) => {
      await q.refetch();
      toast.success(`Measured CAD features on ${result.parts_measured} parts`, {
        description: "Sampled wing sections and contact widths still require manual verification.",
      });
    },
    onError: (error) => toast.error("Could not measure CAD", { description: error.message }),
  });
  const checks = (q.data?.checks ?? []).toSorted(
    (a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state),
  );
  const fails = checks.filter((c) => c.state === "fail_cad").length;
  const risks = checks.filter((c) => c.state === "at_risk").length;
  const points = q.data?.points_at_risk;
  const manual = checks.filter((c) => c.state === "manual_review").length;

  return (
    <Panel
      title="Legal · FORGE"
      actions={
        q.data && (
          <span
            className={cn(
              "text-xs font-medium",
              fails
                ? "text-destructive"
                : risks
                  ? "text-risk"
                  : manual
                    ? "text-muted-foreground"
                    : "text-ok",
            )}
          >
            {fails
              ? `${fails} fail`
              : risks
                ? `${risks} at risk`
                : manual
                  ? `${manual} to review`
                  : "✓ CAD checks pass"}
            {points && (points.failing_points > 0 || points.at_risk_points > 0) && (
              <span className="tabular ml-2 font-mono">
                −{points.failing_points} pts
                {points.at_risk_points > 0 && ` (${points.at_risk_points} at risk)`}
              </span>
            )}
          </span>
        )
      }
      bodyClassName="overflow-y-auto"
    >
      {q.isError || designs.isError ? (
        <div className="p-4 text-sm">
          Could not load FORGE checks.{" "}
          <Button
            variant="link"
            onClick={() => {
              void designs.refetch();
              void q.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : designs.isSuccess && !design ? (
        <p className="p-4 text-sm text-muted-foreground">
          Import a car in Design Studio to check the India NF rules.
        </p>
      ) : !q.data ? (
        <Skeleton className="m-4 h-40" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-2 text-2xs text-muted-foreground">
            <span>
              {q.data.revision}
              {points ? ` · ${points.manual_review_rules} rules to measure by hand` : ""}
            </span>
            {design && (
              <Button
                size="sm"
                variant="ghost"
                disabled={measurement.isPending}
                onClick={() => measurement.mutate()}
              >
                {measurement.isPending ? "Measuring CAD…" : "Measure CAD features"}
              </Button>
            )}
            {design && (
              <a
                href={forgeSheetUrl(design)}
                target="_blank"
                rel="noreferrer"
                className="rounded px-1.5 py-0.5 text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Scrutineering sheet (PDF)
              </a>
            )}
            {design && (
              <a
                href={forgeSummaryUrl(design)}
                target="_blank"
                rel="noreferrer"
                className="rounded px-1.5 py-0.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                One-page summary (PDF)
              </a>
            )}
          </div>
          <details className="group border-b border-border/50 px-4 py-2">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-text-2">Manufacturing risk</span>
              {risk.data ? (
                <>
                  <span
                    className={cn(
                      "tabular font-mono",
                      risk.data.overall_pass_probability < 0.8
                        ? "text-destructive"
                        : risk.data.overall_pass_probability < 0.95
                          ? "text-risk"
                          : "text-ok",
                    )}
                  >
                    {fmtPct(risk.data.overall_pass_probability, 1)}% pass
                  </span>
                  <span>· {fmt(risk.data.expected_points_lost, 1)} pts expected</span>
                  <span>· p95 {fmt(risk.data.p95_points_lost, 1)}</span>
                </>
              ) : risk.isError ? (
                <span className="text-destructive">unavailable</span>
              ) : (
                <span>calculating…</span>
              )}
              <span className="ml-auto group-open:hidden">expand</span>
              <span className="ml-auto hidden group-open:inline">hide</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <NumberField
                id="forge-sigma"
                label="Process σ"
                unit="mm"
                value={sigma}
                onChange={setSigma}
                min={0.001}
                max={1}
                step={0.005}
              />
              {risk.data && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    {
                      label: "pass",
                      value: `${fmtPct(risk.data.overall_pass_probability, 1)}%`,
                    },
                    { label: "expected", value: fmt(risk.data.expected_points_lost, 1) },
                    { label: "p95", value: fmt(risk.data.p95_points_lost, 1) },
                    { label: "tail", value: fmt(risk.data.cvar95_points_lost, 1) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md border border-border/60 px-2 py-1">
                      <div className="tabular font-mono text-xs text-foreground">{stat.value}</div>
                      <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {risk.isError && <p className="mt-2 text-2xs text-destructive">{risk.error.message}</p>}
            {risk.data && (
              <p className="mt-2 text-2xs leading-4 text-muted-foreground">
                Normal, independent process model at the declared σ. CAD nominal, not a measured
                capability. {risk.data.excluded_rules} manual or non-length rules excluded.
              </p>
            )}
            {risk.data && <RuleRiskDetail risk={risk.data} />}
          </details>
          <table className="w-full text-xs">
            <tbody>
              {checks.map((c) => (
                <tr
                  key={c.rule_id}
                  className="border-b border-border/50 last:border-0"
                  title={`${c.rule_id} (p. ${c.page})${c.note ? ` · ${c.note}` : ""}`}
                >
                  {" "}
                  <td className="py-1.5 pl-4">
                    <span
                      className={cn("mr-2 inline-block size-1.5 rounded-full", STATE[c.state].dot)}
                      aria-hidden
                    />
                    <span className="sr-only">{STATE[c.state].label}: </span>
                    {(c.state === "fail_cad" || c.state === "at_risk") && design ? (
                      <Button
                        variant="link"
                        className="h-auto max-w-full justify-start p-0 text-left text-xs whitespace-normal"
                        title={`Focus ${c.parts.length ? c.parts.join(", ") : "the complete car"} in CAD`}
                        onClick={() =>
                          onFocus ? onFocus(c.parts) : router.push(cadFocusHref(design, c.parts))
                        }
                      >
                        <span>
                          <span className="font-mono text-muted-foreground">{c.rule_id}</span> ·{" "}
                          {c.name}
                        </span>
                      </Button>
                    ) : (
                      <span>
                        <span className="font-mono text-muted-foreground">{c.rule_id}</span> ·{" "}
                        {c.name}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                    {c.value != null ? c.value.toFixed(1) : "—"}
                    <span className="opacity-60"> / {limit(c)}</span>
                  </td>
                  <td
                    className={cn(
                      "tabular pr-4 text-right font-mono whitespace-nowrap",
                      c.state === "fail_cad" && "text-destructive",
                      c.state === "at_risk" && "text-risk",
                    )}
                  >
                    {c.margin != null
                      ? `${c.margin > 0 ? "+" : ""}${c.margin.toFixed(1)} ${c.unit}`
                      : STATE[c.state].label}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {normalisedHeadroom(c) == null ? "not applicable" : headroomLabel(c)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}
