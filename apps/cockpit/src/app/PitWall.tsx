"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AeroMap, BenchmarkChart, cm2, ScoreGauge } from "@/components/pitwall/PitCharts";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { SealedReveal } from "@/components/pitwall/SealedReveal";
import { Metric, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { getOracleState } from "@/lib/api";

const prettify = (n: string) => n.replace(/_/g, " ");

export function PitWall() {
  const q = useQuery({ queryKey: ["oracle"], queryFn: getOracleState, staleTime: 60_000 });
  const s = q.data;
  const prov = s?.provenance === "synthetic" ? "synthetic" : "simulated";
  const gain = s ? s.best.race_time_s - s.next.race_time_s : 0;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Headline row */}
      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-5">
        <Panel title="Car" className="row-span-1" bodyClassName="p-1">
          {s ? <ScoreGauge s={s} /> : <Skeleton className="h-36" />}
        </Panel>
        <Metric
          label="Best CdA"
          value={s ? cm2(s.best.cda_m2) : "—"}
          unit="cm²"
          provenance={s ? prov : undefined}
        />
        <Metric
          label="Predicted race"
          value={s ? s.best.race_time_s.toFixed(3) : "—"}
          unit="s"
          provenance={s ? "predicted" : undefined}
        />
        <Metric
          label="Next run gain"
          value={s ? (gain * 1000).toFixed(1) : "—"}
          unit="ms"
          provenance={s ? "predicted" : undefined}
        />
        <Metric
          label="Runs"
          value={s ? String(s.observations.length) : "—"}
          provenance={s ? prov : undefined}
        />
      </div>

      <Panel
        title="Aero map"
        actions={s && <ProvenanceBadge value={prov} />}
        className="min-h-80 lg:col-span-5 lg:row-span-2 lg:min-h-0"
        bodyClassName="p-2"
      >
        {s ? <AeroMap s={s} /> : <Skeleton className="size-full" />}
      </Panel>

      <Panel
        title="Next run · ORACLE"
        className="min-h-56 lg:col-span-4 lg:min-h-0"
        bodyClassName="p-4"
      >
        {s ? (
          <div className="flex h-full flex-col gap-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {s.variables.map((v) => (
                <div key={v.name} className="contents">
                  <dt className="text-muted-foreground capitalize">{prettify(v.name)}</dt>
                  <dd className="tabular text-right font-mono">
                    {s.next.params[v.name].toFixed(1)}{" "}
                    <span className="text-muted-foreground">{v.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex items-baseline justify-between border-t pt-3 font-mono text-xs">
              <span className="text-muted-foreground">CdA</span>
              <span className="tabular">
                {cm2(s.next.cda_m2)} ± {cm2(s.next.cda_sd_m2)} cm²
              </span>
            </div>
          </div>
        ) : (
          <Skeleton className="size-full" />
        )}
      </Panel>

      <Panel
        title="ORACLE vs random"
        className="min-h-56 lg:col-span-2 lg:min-h-0"
        bodyClassName="p-2"
      >
        {s ? <BenchmarkChart s={s} /> : <Skeleton className="size-full" />}
      </Panel>
      <Panel title="Sealed prediction" className="min-h-56 lg:col-span-2 lg:min-h-0">
        <SealedReveal />
      </Panel>

      <div className="min-h-72 lg:col-start-10 lg:col-span-3 lg:row-span-2 lg:row-start-2 lg:min-h-0 [&>section]:h-full">
        <LegalPanel />
      </div>
      <nav className="grid grid-cols-3 gap-3 lg:col-span-12" aria-label="Deep workspaces">
        {[
          ["/simulate", "Wind Tunnel"],
          ["/design", "Design Studio"],
          ["/race", "Race"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border bg-card px-4 py-3 text-sm shadow-panel transition-colors hover:bg-accent"
          >
            {label} →
          </Link>
        ))}
      </nav>
      {q.error && <p className="text-xs text-destructive lg:col-span-12">{q.error.message}</p>}
    </div>
  );
}
