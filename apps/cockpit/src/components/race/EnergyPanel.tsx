"use client";

import { EmptyState, Metric, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import type { EnergyAudit } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EnergySankey } from "./EnergySankey";
import { Zap } from "lucide-react";

const pct = (v: number) => (v * 100).toFixed(1);

/** T19 energy audit: where every joule of thrust went in the simulated run. */
export function EnergyPanel({
  data,
  error,
  fetching,
}: {
  data: EnergyAudit | undefined;
  error: Error | null;
  fetching: boolean;
}) {
  if (error) {
    return (
      <Panel title="Where the energy goes">
        <EmptyState icon={<Zap className="size-5" />} title="Energy audit unavailable">
          {error.message}
        </EmptyState>
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel title="Where the energy goes">
        <Skeleton className="m-4 h-40" />
      </Panel>
    );
  }
  const work = data.thrust_work_j;
  return (
    <Panel
      title="Where the energy goes"
      description="Work done by thrust, split into speed kept at the finish line and losses on the way."
      actions={
        <>
          {fetching && <span className="text-2xs text-muted-foreground">updating…</span>}
          <ProvenanceBadge value="predicted" />
        </>
      }
      bodyClassName="flex flex-col gap-4 p-4"
    >
      <EnergySankey data={data} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Thrust work" value={work.toFixed(2)} unit="J" />
        <Metric label="Kept as speed" value={pct(data.conversion_efficiency)} unit="%" />
        <Metric
          label="Biggest loss"
          value={data.dominant_loss}
          hint="The term to work on first to finish faster"
        />
        <Metric
          label="Shed while coasting"
          value={data.coast_phase_loss_j.toFixed(2)}
          unit="J"
          hint={`After thrust ends at ${data.thrust_end_s.toFixed(2)} s`}
        />
      </div>
      <p
        className={cn(
          "text-2xs",
          data.closure_fraction < 0.01 ? "text-muted-foreground" : "text-risk",
        )}
      >
        Energy books balance to {pct(data.closure_fraction)}% of the thrust work (integration
        check).
      </p>
    </Panel>
  );
}
