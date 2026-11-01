"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { SpreadChart } from "@/components/charts/SpreadChart";
import { NumberField, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { type RaceSimulationRequest, raceMonteCarlo, type UncertaintyInput } from "@/lib/api";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof UncertaintyInput, string> = {
  thrust: "Thrust",
  cda: "CdA",
  mass: "Mass",
  crr: "Rolling",
};

/** Race-time spread from input uncertainty (Monte Carlo, 1000 seeded samples). */
export function SpreadPanel({ request }: { request: RaceSimulationRequest }) {
  const [unc, setUnc] = useState<UncertaintyInput>({
    thrust: 0.05,
    cda: 0.05,
    mass: 0.005,
    crr: 0.2,
  });
  const deferred = useDeferredValue({ request, unc });
  const valid = Object.values(unc).every((v) => v >= 0 && v < 0.5);
  const mc = useQuery({
    queryKey: ["race-mc", deferred],
    queryFn: () => raceMonteCarlo(deferred.request, deferred.unc),
    enabled: valid,
    placeholderData: (prev) => prev,
  });
  const d = mc.data;
  const p = d?.percentiles_s ?? {};
  const ranked = Object.entries(d?.sensitivity ?? {}).toSorted(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );

  return (
    <Panel
      title="Race-time spread"
      description="1000 seeded samples from the 1σ input uncertainties below."
      actions={
        <>
          {mc.isFetching && <span className="text-2xs text-muted-foreground">sampling…</span>}
          <ProvenanceBadge value="predicted" />
        </>
      }
      bodyClassName="grid gap-4 p-4 lg:grid-cols-[1fr_260px]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <dl className="grid grid-cols-4 gap-3 text-sm">
          {(
            [
              ["p5", p.p5],
              ["median", p.p50],
              ["p95", p.p95],
              ["finish", d ? d.finish_fraction * 100 : undefined],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="tabular font-medium">
                {v == null ? "—" : k === "finish" ? `${v.toFixed(1)}%` : `${v.toFixed(3)} s`}
              </dd>
            </div>
          ))}
        </dl>
        <div className="h-44">
          {d && d.histogram.counts.length > 0 ? (
            <SpreadChart
              edges={d.histogram.edges_s}
              counts={d.histogram.counts}
              percentiles={d.percentiles_s}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {mc.error ? mc.error.message : "No finishing samples"}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(LABELS) as Array<keyof UncertaintyInput>).map((k) => (
            <NumberField
              key={k}
              id={`mc-${k}`}
              label={`${LABELS[k]} 1σ`}
              unit="%"
              value={+(unc[k] * 100).toFixed(2)}
              min={0}
              max={49}
              step={0.5}
              onChange={(v) => setUnc((u) => ({ ...u, [k]: v / 100 }))}
            />
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">What drives the spread</p>
          <ul className="space-y-1.5">
            {ranked.map(([k, rho]) => (
              <li key={k} className="grid grid-cols-[64px_1fr_44px] items-center gap-2 text-xs">
                <span className="text-text-2">{LABELS[k as keyof UncertaintyInput] ?? k}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <span
                    className={cn("block h-full rounded-full", rho < 0 ? "bg-ok" : "bg-risk")}
                    style={{ width: `${Math.min(Math.abs(rho), 1) * 100}%` }}
                  />
                </span>
                <span className="tabular text-right text-muted-foreground">{rho.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
