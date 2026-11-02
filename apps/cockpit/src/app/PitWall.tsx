"use client";

import { useQuery } from "@tanstack/react-query";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { AeroMap, BenchmarkChart, cm2 } from "@/components/pitwall/PitCharts";
import { SealedReveal } from "@/components/pitwall/SealedReveal";
import { HeroImage, useHeroRun } from "@/components/render/HeroRender";
import { StatusBar, useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { getOracleState } from "@/lib/api";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "oracle", label: "ORACLE" },
] as const;

const prettify = (n: string) => n.replace(/_/g, " ");

export function PitWall() {
  const [tab, setTab] = useTab(TABS);
  const q = useQuery({ queryKey: ["oracle"], queryFn: getOracleState, staleTime: 60_000 });
  const heroRun = useHeroRun();
  const s = q.data;
  const prov = s?.provenance === "synthetic" ? "synthetic" : "simulated";
  const gain = s ? s.best.race_time_s - s.next.race_time_s : 0;

  const status = s
    ? [
        { label: "Best CdA", value: `${cm2(s.best.cda_m2)} cm²` },
        { label: "Race", value: `${s.best.race_time_s.toFixed(3)} s` },
        { label: "Runs", value: String(s.observations.length) },
        { label: "Next gain", value: `${(gain * 1000).toFixed(1)} ms` },
        {
          label: "Data",
          value: s.provenance,
          tone: s.provenance === "synthetic" ? ("risk" as const) : undefined,
        },
      ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        right={
          <a
            href="/api/v1/report/pdf"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Report PDF ↗
          </a>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "overview" && (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 lg:h-full lg:grid-cols-[1fr_1fr] lg:grid-rows-[auto_auto_1fr]">
            {heroRun && (
              <Panel title={`Flow · ${heroRun}`} className="lg:col-span-2" bodyClassName="p-0">
                <HeroImage runId={heroRun} className="aspect-[16/6] rounded-none" />
              </Panel>
            )}
            <Panel title="Car" bodyClassName="flex items-center gap-8 p-4">
              {s ? (
                <>
                  <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      ["Drag area", cm2(s.best.cda_m2), "cm²"],
                      ["Predicted race", s.best.race_time_s.toFixed(3), "s"],
                      ["Next run gain", (gain * 1000).toFixed(1), "ms"],
                      ["CFD runs", String(s.observations.length), ""],
                    ].map(([l, v, u]) => (
                      <div key={l}>
                        <dt className="text-xs text-muted-foreground">{l}</dt>
                        <dd className="tabular font-mono text-2xl">
                          {v}
                          <span className="ml-1 text-xs text-muted-foreground">{u}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </Panel>
            <Panel title="Sealed prediction">
              <SealedReveal />
            </Panel>
            <Panel
              title="Next run · ORACLE"
              actions={s && <ProvenanceBadge value={prov} />}
              bodyClassName="p-4"
            >
              {s ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {s.variables.map((v) => (
                    <div key={v.name} className="contents">
                      <dt className="text-muted-foreground capitalize">{prettify(v.name)}</dt>
                      <dd className="tabular text-right font-mono">
                        {s.next.params[v.name].toFixed(1)}{" "}
                        <span className="text-muted-foreground">{v.unit}</span>
                      </dd>
                    </div>
                  ))}
                  <dt className="mt-2 border-t pt-2 text-muted-foreground">Predicted CdA</dt>
                  <dd className="tabular mt-2 border-t pt-2 text-right font-mono">
                    {cm2(s.next.cda_m2)} ± {cm2(s.next.cda_sd_m2)} cm²
                  </dd>
                </dl>
              ) : (
                <Skeleton className="h-40" />
              )}
            </Panel>
            <div className="min-h-72 [&>section]:h-full">
              <LegalPanel />
            </div>
          </div>
        )}
        {tab === "oracle" && (
          <div className="grid h-full min-h-[520px] grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
            <Panel
              title="Aero map"
              actions={s && <ProvenanceBadge value={prov} />}
              bodyClassName="p-2"
            >
              {s ? <AeroMap s={s} /> : <Skeleton className="size-full" />}
            </Panel>
            <Panel title="ORACLE vs random · same budget" bodyClassName="p-2">
              {s ? <BenchmarkChart s={s} /> : <Skeleton className="size-full" />}
            </Panel>
          </div>
        )}
        {q.error && <p className="mt-3 text-xs text-destructive">{q.error.message}</p>}
      </div>
      <StatusBar items={status} />
    </div>
  );
}
