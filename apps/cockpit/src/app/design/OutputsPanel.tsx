"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { Metric, Panel, Skeleton } from "@/components/ui/primitives";
import {
  getDesignGeometry,
  getForgeChecks,
  getOracleState,
  listPredictions,
  type Provenance,
  type RuleCheck,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const MIN_MASS_G = 50;

type Tile = {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "risk" | "danger";
  source?: Provenance;
};

const STATE_ORDER: Record<RuleCheck["state"], number> = {
  fail_cad: 0,
  at_risk: 1,
  manual_review: 2,
  pass_cad_only: 3,
};
const STATE_LABEL: Record<RuleCheck["state"], string> = {
  fail_cad: "Fail",
  at_risk: "At risk",
  manual_review: "Manual",
  pass_cad_only: "Pass",
};
const STATE_TEXT: Record<RuleCheck["state"], string> = {
  fail_cad: "text-destructive",
  at_risk: "text-risk",
  manual_review: "text-muted-foreground",
  pass_cad_only: "text-text-3",
};

function fmt(v: number | null | undefined, digits = 2) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

/** Everything known about one design on one screen; each card links to its full analysis. */
export function OutputsPanel({
  design,
  onFocus,
}: {
  design?: string;
  onFocus?: (check: RuleCheck) => void;
}) {
  const geom = useQuery({
    queryKey: ["design-geometry", design],
    queryFn: () => getDesignGeometry(design!),
    enabled: !!design,
  });
  const forge = useQuery({
    queryKey: ["forge-checks", design],
    queryFn: () => getForgeChecks(design!),
    enabled: !!design,
  });
  const oracle = useQuery({ queryKey: ["oracle-state"], queryFn: getOracleState });
  const preds = useQuery({ queryKey: ["predictions"], queryFn: listPredictions });

  if (!design) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">
        Pick a design to see its outputs.
      </p>
    );
  }

  const checks = forge.data?.checks ?? [];
  const count = (s: RuleCheck["state"]) => checks.filter((c) => c.state === s).length;
  const fails = count("fail_cad");
  const risks = count("at_risk");
  const par = forge.data?.points_at_risk;
  const latest = preds.data?.at(-1);
  const g = geom.data;
  const massCheck = checks.find((c) => /mass/i.test(c.name));

  const tiles: Tile[] = [
    {
      label: "Frontal area",
      value: g ? fmt(g.frontal_area_m2 * 1e4, 1) : "—",
      unit: "cm²",
      sub: g
        ? `${fmt(g.length_m * 1e3, 1)} × ${fmt(g.width_m * 1e3, 1)} × ${fmt(g.height_m * 1e3, 1)} mm`
        : undefined,
      source: "estimated",
    },
    {
      label: "Best CdA (ORACLE)",
      value: oracle.data ? fmt(oracle.data.best.cda_m2 * 1e4, 2) : "—",
      unit: "cm²",
      sub: oracle.data ? `${oracle.data.observations.length} observations` : undefined,
      source: oracle.data?.provenance === "synthetic" ? "synthetic" : "simulated",
    },
    {
      label: "Predicted race time",
      value: latest
        ? fmt(latest.predicted.value, 3)
        : oracle.data
          ? fmt(oracle.data.best.race_time_s, 3)
          : "—",
      unit: "s",
      sub: latest
        ? `${fmt(latest.interval_low.value, 3)} – ${fmt(latest.interval_high.value, 3)} s`
        : "no saved prediction",
      source: "predicted",
    },
    {
      label: "Mass vs minimum",
      value: massCheck?.value != null ? fmt(massCheck.value, 1) : "—",
      unit: "g",
      sub: `minimum ${MIN_MASS_G.toFixed(1)} g · weigh the car`,
      tone: massCheck?.value != null && massCheck.value < MIN_MASS_G ? "danger" : undefined,
      source: massCheck?.value != null ? "estimated" : undefined,
    },
    {
      label: "Rules",
      value: `${fails ? fails : risks}`,
      unit: fails ? "failing" : "at risk",
      sub: `${fails} fail · ${risks} at risk · ${count("pass_cad_only")} pass · ${count("manual_review")} manual`,
      tone: fails ? "danger" : risks ? "risk" : undefined,
    },
    {
      label: "Points at risk",
      value: par ? fmt(par.failing_points + par.at_risk_points, 0) : "—",
      unit: "pts",
      sub: par
        ? `${fmt(par.failing_points, 0)} failing · ${fmt(par.at_risk_points, 0)} at risk`
        : undefined,
      tone: par && par.failing_points > 0 ? "danger" : undefined,
    },
  ];

  const ranked = checks
    .filter((c) => c.state !== "pass_cad_only")
    .toSorted(
      (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.margin ?? 0) - (b.margin ?? 0),
    )
    .slice(0, 8);

  const parts = (g?.parts ?? [])
    .map((p) => ({ label: p.label, group: p.group, cm3: p.volume_m3 * 1e6 }))
    .toSorted((a, b) => b.cm3 - a.cm3);
  const maxCm3 = parts[0]?.cm3 ?? 1;

  const loading = geom.isPending || forge.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {loading
          ? tiles.map((t) => <Skeleton key={t.label} className="h-[92px] rounded-lg" />)
          : tiles.map((t) => (
              <Metric
                key={t.label}
                label={t.label}
                value={t.value}
                unit={t.unit}
                hint={t.sub}
                tone={t.tone}
                provenance={t.source}
              />
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Rules to fix first"
          description="Failing and at-risk India NF rules, worst first. Click to open the part in CAD."
          actions={
            <a
              href="#rules"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              All rules <ArrowUpRight className="size-3.5" />
            </a>
          }
        >
          {ranked.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No failing or at-risk rules.</p>
          ) : (
            <table className="w-full table-fixed text-[13px]">
              <thead className="text-[11px] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-normal">Rule</th>
                  <th className="w-28 px-2 py-2 text-right font-normal">Value</th>
                  <th className="w-20 px-2 py-2 text-right font-normal">Margin</th>
                  <th className="w-24 px-4 py-2 text-right font-normal">State</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c) => (
                  <tr
                    key={c.rule_id}
                    tabIndex={0}
                    onClick={() => onFocus?.(c)}
                    onKeyDown={(e) => e.key === "Enter" && onFocus?.(c)}
                    className="cursor-pointer border-b border-border/60 outline-none last:border-0 hover:bg-accent/50 focus-visible:bg-accent/50"
                  >
                    <td className="max-w-0 truncate px-4 py-2">
                      <span className="font-mono text-text-3">{c.rule_id}</span> {c.name}
                    </td>
                    <td className="tabular px-2 py-2 text-right font-mono">
                      {fmt(c.value)} <span className="text-text-3">{c.unit}</span>
                    </td>
                    <td className="tabular px-2 py-2 text-right font-mono">{fmt(c.margin)}</td>
                    <td className={cn("px-4 py-2 text-right text-xs", STATE_TEXT[c.state])}>
                      {STATE_LABEL[c.state]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title="Volume by part"
          description="CAD volume per part; multiply by density for mass. Biggest first."
          actions={
            <a
              href="#inspect"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Inspect <ArrowUpRight className="size-3.5" />
            </a>
          }
        >
          <ul className="flex flex-col gap-2 p-4">
            {parts.slice(0, 10).map((p) => (
              <li
                key={p.label}
                className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 text-[13px]"
              >
                <span className="truncate">{p.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-brand/70"
                    style={{ width: `${(p.cm3 / maxCm3) * 100}%` }}
                  />
                </span>
                <span className="tabular text-right font-mono text-xs">
                  {fmt(p.cm3, 2)} <span className="text-text-3">cm³</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
