"use client";

import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SensitivityPanel } from "@/components/pitwall/SensitivityPanel";
import { BuildNextControls } from "@/components/pitwall/BuildNextControls";
import { TestPlannerPanel } from "@/components/pitwall/TestPlannerPanel";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { AeroMap, ParetoFront } from "@/components/pitwall/PitCharts";
import { SealedReveal } from "@/components/pitwall/SealedReveal";
import { HeroImage, useHeroRun } from "@/components/render/HeroRender";
import { StatusBar, useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { Panel, ProvenanceBadge, Skeleton, SegmentedControl } from "@/components/ui/primitives";
import { getOracleState } from "@/lib/api";
import { fmtCm2, fmtCount, fmtMs, fmtSec } from "@/lib/format";

const PitWallDock = lazy(() =>
  import("@/components/pitwall/PitWallDock").then((m) => ({ default: m.PitWallDock })),
);

const OptimizerBenchmark = lazy(() =>
  import("@/components/pitwall/OptimizerBenchmark").then((m) => ({
    default: m.OptimizerBenchmark,
  })),
);

const OracleDiagnostics = lazy(() =>
  import("@/components/pitwall/OracleDiagnostics").then((m) => ({ default: m.OracleDiagnostics })),
);
const CampaignAnalysis = lazy(() =>
  import("@/components/pitwall/CampaignAnalysis").then((m) => ({ default: m.CampaignAnalysis })),
);
const ORACLE_VIEWS = [
  { value: "map", label: "Response map" },
  { value: "pareto", label: "Pareto front" },
  { value: "benchmark", label: "Benchmark" },
  { value: "validation", label: "Validation" },
  { value: "campaign", label: "Campaign" },
] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "oracle", label: "ORACLE" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "test-planner", label: "Test planner" },
] as const;

const prettify = (n: string) => n.replace(/_/g, " ");

export function PitWall() {
  const [oracleView, setOracleView] = useState<(typeof ORACLE_VIEWS)[number]["value"]>("map");
  const [tab, setTab] = useTab(TABS);
  const q = useQuery({ queryKey: ["oracle"], queryFn: getOracleState, staleTime: 60_000 });
  const heroRun = useHeroRun();
  const s = q.data;
  const prov = s?.provenance === "synthetic" ? "synthetic" : "simulated";
  const gain = s ? s.best.race_time_s - s.next.race_time_s : 0;

  const status = s
    ? [
        { label: "Best CdA", value: `${fmtCm2(s.best.cda_m2)} cm²` },
        { label: "Race", value: `${fmtSec(s.best.race_time_s)} s` },
        { label: "Observations", value: fmtCount(s.observations.length) },
        { label: "Next gain", value: `${fmtMs(gain)} ms` },
        {
          label: "Data",
          value: s.provenance,
          tone: s.provenance === "synthetic" ? ("risk" as const) : undefined,
        },
      ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceTabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "overview" && (
          <Suspense fallback={<Skeleton className="h-full min-h-96" />}>
            <PitWallDock
              slots={{
                flow: heroRun ? (
                  <Panel
                    title="Flow"
                    description={heroRun}
                    actions={<ProvenanceBadge value="simulated" />}
                  >
                    <HeroImage runId={heroRun} fit="contain" className="h-64 w-full" />
                  </Panel>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No flow render available. Select a completed CFD run in Wind Tunnel.
                  </p>
                ),
                car: (
                  <Panel title="Car" bodyClassName="flex items-center gap-8 p-4">
                    {s ? (
                      <>
                        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                          {[
                            ["Drag area", fmtCm2(s.best.cda_m2), "cm²"],
                            ["Predicted race", fmtSec(s.best.race_time_s), "s"],
                            ["Next run gain", fmtMs(gain), "ms"],
                            ["Observations", fmtCount(s.observations.length), ""],
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
                ),
                sealed: (
                  <Panel title="Sealed prediction">
                    <SealedReveal />
                  </Panel>
                ),
                next: (
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
                          {fmtCm2(s.next.cda_m2)} ± {fmtCm2(s.next.cda_sd_m2)} cm²
                        </dd>
                      </dl>
                    ) : (
                      <Skeleton className="h-40" />
                    )}
                    {s && (
                      <BuildNextControls
                        key={s.next.unit.join(",")}
                        unit={s.next.unit}
                        reason={`EI ${fmtCm2(s.next.expected_improvement_m2)} cm² · GP uncertainty ${fmtCm2(s.next.cda_sd_m2)} cm² · shortest GP length scale: ${prettify(s.next.shortest_length_scale_variable)}`}
                      />
                    )}
                  </Panel>
                ),
                rules: <LegalPanel />,
              }}
            />
          </Suspense>
        )}
        {tab === "oracle" && (
          <div className="mx-auto flex h-full min-h-[520px] max-w-6xl flex-col gap-3">
            <div className="shrink-0 overflow-x-auto">
              <SegmentedControl
                options={ORACLE_VIEWS}
                value={oracleView}
                onChange={setOracleView}
                label="ORACLE analysis"
              />
            </div>
            <div className="min-h-0 flex-1 [&>section]:h-full">
              {oracleView === "map" && (
                <Panel
                  title="GP response and uncertainty"
                  actions={s && <ProvenanceBadge value={prov} />}
                  bodyClassName="p-3"
                >
                  {s ? <AeroMap s={s} /> : <Skeleton className="size-full" />}
                </Panel>
              )}
              {oracleView === "pareto" && (
                <Panel
                  title="Drag vs confidence (NSGA-II, pymoo)"
                  description="Each point is a feasible design no other design beats on both predicted CdA and its uncertainty."
                  actions={<ProvenanceBadge value="predicted" />}
                  bodyClassName="p-3"
                >
                  <ParetoFront />
                </Panel>
              )}
              {oracleView === "benchmark" && (
                <Suspense fallback={<Skeleton className="h-80" />}>
                  <OptimizerBenchmark />
                </Suspense>
              )}
              {oracleView === "campaign" && (
                <Suspense fallback={<Skeleton className="h-80" />}>
                  <CampaignAnalysis
                    key={s?.next.unit.join(",") ?? "loading"}
                    unit={s?.next.unit ?? []}
                  />
                </Suspense>
              )}
              {oracleView === "validation" && (
                <Suspense fallback={<Skeleton className="h-80" />}>
                  <OracleDiagnostics />
                </Suspense>
              )}
            </div>
          </div>
        )}
        {tab === "sensitivity" && (
          <div className="mx-auto h-full max-w-5xl [&>section]:h-full">
            <SensitivityPanel />
          </div>
        )}
        {tab === "test-planner" && (
          <div className="mx-auto max-w-5xl">
            <TestPlannerPanel />
          </div>
        )}
        {q.error && <p className="mt-3 text-xs text-destructive">{q.error.message}</p>}
      </div>
      <StatusBar items={status} />
    </div>
  );
}
