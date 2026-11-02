"use client";

import { EmptyState, Metric, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import type { EnergyAudit } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const SEGMENTS = [
  { key: "kinetic", label: "Still speed at the finish", tone: "bg-ok" },
  { key: "drag", label: "Lost to drag", tone: "bg-risk" },
  { key: "rolling", label: "Lost to rolling", tone: "bg-line-strong" },
] as const;

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
  const share = {
    kinetic: data.kinetic_energy_j / work,
    drag: (data.losses_j.drag ?? 0) / work,
    rolling: (data.losses_j.rolling ?? 0) / work,
  };
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
      <div>
        <div
          className="flex h-6 w-full overflow-hidden rounded-sm border border-border"
          role="img"
          aria-label={SEGMENTS.map((s) => `${s.label} ${pct(share[s.key])}%`).join(", ")}
        >
          {SEGMENTS.map((s) => (
            <div
              key={s.key}
              className={s.tone}
              style={{ width: `${Math.max(0, share[s.key]) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("inline-block size-2 rounded-sm", s.tone)} aria-hidden />
              {s.label}
              <span className="tabular font-mono text-foreground">{pct(share[s.key])}%</span>
            </li>
          ))}
        </ul>
      </div>
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
