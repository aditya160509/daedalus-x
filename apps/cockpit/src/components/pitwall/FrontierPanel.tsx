"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { chartTheme, useECharts } from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { getForgeChecks, getForgeFrontier, type ForgeFrontier, type RuleCheck } from "@/lib/api";

type Row = ForgeFrontier["rows"][number] & { check: RuleCheck };

function MarginChart({ rows, unit }: { rows: Row[]; unit: string }) {
  const host = useECharts(() => {
    const theme = chartTheme();
    return {
      animation: false,
      grid: { left: 12, right: 24, top: 16, bottom: 38, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) =>
          typeof value === "number" ? `${value.toFixed(2)} ${unit}` : "—",
      },
      xAxis: {
        type: "value",
        name: `Headroom [${unit}]`,
        nameLocation: "middle",
        nameGap: 26,
        axisLabel: { color: theme.muted },
        splitLine: { lineStyle: { color: theme.line } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((row) => `${row.rule_id} · p. ${row.check.page}`),
        axisLabel: { color: theme.text2 },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 18,
          itemStyle: { color: theme.brand },
          data: rows.map((row) => row.headroom),
        },
      ],
    };
  }, [rows, unit]);
  return (
    <div
      ref={host}
      role="img"
      aria-label={`Nearest rule limit headroom in ${unit}; full values are listed below`}
      style={{ height: Math.max(180, rows.length * 32 + 65) }}
      className="w-full"
    />
  );
}

export function FrontierPanel({
  design,
  onFocus,
}: {
  design?: string;
  onFocus: (parts: string[]) => void;
}) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const frontier = useQuery({
    queryKey: ["forge-frontier", design],
    queryFn: () => getForgeFrontier(design!),
    enabled: !!design,
  });
  const checks = useQuery({
    queryKey: ["forge", design],
    queryFn: () => getForgeChecks(design!),
    enabled: !!design,
  });
  const rows: Row[] = (frontier.data?.rows ?? []).flatMap((row) => {
    const check = checks.data?.checks.find((c) => c.rule_id === row.rule_id);
    return check ? [{ ...row, check }] : [];
  });
  const units = [...new Set(rows.map((row) => row.unit))];
  const unit = selectedUnit && units.includes(selectedUnit) ? selectedUnit : units[0];
  const visible = rows.filter((row) => row.unit === unit);
  return (
    <Panel
      title="Nearest legal limits"
      actions={
        <ProvenanceBadge
          value="estimated"
          title="Margins computed from CAD; some rule measures are approximations. Physical inspection is required."
        />
      }
      bodyClassName="overflow-y-auto"
    >
      <div className="space-y-4 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Headroom to each rule’s nearest boundary for this CAD design. Negative values are outside
          the limit. This is a single-design margin ranking, not a map of the feasible design space;
          unmeasurable rules are excluded. CAD-derived and approximate values require physical
          verification.
        </p>
        {!design ? (
          <p className="text-sm">Select an imported design to inspect its limits.</p>
        ) : frontier.isError || checks.isError ? (
          <div role="alert" className="text-sm">
            Could not load rule margins: {(frontier.error ?? checks.error)?.message}{" "}
            <Button
              variant="link"
              onClick={() => {
                void frontier.refetch();
                void checks.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : !frontier.data || !checks.data ? (
          <Skeleton className="h-48" />
        ) : !rows.length ? (
          <p className="text-sm">No computable rule margins are available for this design.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {checks.data.revision} · {checks.data.checks.filter((c) => c.margin === null).length}{" "}
              rules without computable margins. Select a unit to avoid comparing unlike quantities.
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Margin units">
              {units.map((u) => (
                <Button
                  key={u}
                  variant={u === unit ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedUnit(u)}
                >
                  {u || "dimensionless"}
                </Button>
              ))}
            </div>
            <MarginChart rows={visible} unit={unit || "1"} />
            <div className="space-y-2">
              {visible.map((row) => (
                <div key={row.rule_id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="font-mono">{row.rule_id}</span> · {row.name} · p.{" "}
                      {row.check.page}
                    </span>
                    <span className="font-mono tabular-nums">
                      {row.headroom > 0 ? "+" : ""}
                      {row.headroom.toFixed(2)} {row.unit || "1"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nearest {row.limit_side === "min" ? "minimum" : "maximum"} · CAD value{" "}
                    {row.check.value?.toFixed(2)} {row.unit || "1"} ·{" "}
                    {row.check.state.replaceAll("_", " ")}
                  </p>
                  {row.check.note && (
                    <p className="mt-1 text-xs text-muted-foreground">{row.check.note}</p>
                  )}
                  {row.check.parts.length > 0 && (
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto px-0"
                      onClick={() => onFocus(row.check.parts)}
                    >
                      Focus in CAD
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
