"use client";

import { EmptyState, Metric, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import type { RaceBreakdown } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

const INPUT_LABEL: Record<string, string> = {
  mass: "Mass",
  cda: "Drag area (CdA)",
  crr: "Rolling resistance",
  thrust: "Thrust",
  rho: "Air density",
};

const ms = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;

/** ORDER 4 (C19-C21): where the race time goes, what moves it, and what each unit is worth. */
export function BreakdownPanel({
  data,
  error,
  reactionMs,
  reactionInput,
  onReactionInput,
}: {
  data: RaceBreakdown | undefined;
  error: Error | null;
  reactionMs: number | null;
  reactionInput: string;
  onReactionInput: (value: string) => void;
}) {
  if (error) {
    return (
      <Panel title="Race-time breakdown">
        <EmptyState icon={<Timer className="size-5" />} title="Breakdown unavailable">
          {error.message}
        </EmptyState>
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel title="Race-time breakdown">
        <Skeleton className="m-4 h-48" />
      </Panel>
    );
  }
  const b = data.budget_ms;
  const widest = Math.max(
    ...data.tornado.map((r) => Math.max(Math.abs(r.low_ms), Math.abs(r.high_ms))),
    1e-9,
  );
  const x = data.exchange_rates;
  const combinedMs = b.car_time_ms + (reactionMs ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Race-time budget"
        description="Predicted car time plus the reaction measured at the start gate."
        bodyClassName="space-y-3 p-4"
      >
        <label htmlFor="budget-reaction" className="flex max-w-64 flex-col gap-1 text-xs">
          Measured gate reaction (ms)
          <Input
            id="budget-reaction"
            type="number"
            min={0}
            step="any"
            value={reactionInput}
            onChange={(event) => onReactionInput(event.target.value)}
          />
        </label>
        <div className="flex h-4 overflow-hidden rounded bg-muted" aria-hidden>
          <div className="bg-brand" style={{ width: `${(100 * b.car_time_ms) / combinedMs}%` }} />
          {reactionMs != null && <div className="bg-risk flex-1" />}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric
            label="Car time"
            value={b.car_time_ms.toFixed(1)}
            unit="ms"
            provenance="predicted"
          />
          <Metric
            label="Gate reaction"
            value={reactionMs?.toFixed(1) ?? "—"}
            unit="ms"
            hint={
              reactionMs == null
                ? "Enter a measured reaction to include it"
                : "Entered gate measurement"
            }
          />
          <Metric
            label="Combined time"
            value={reactionMs == null ? "—" : combinedMs.toFixed(1)}
            unit="ms"
          />
        </div>
      </Panel>
      <Panel
        title="Where the time goes"
        description="Each loss is switched off independently. These effects are not additive."
        actions={<ProvenanceBadge value="predicted" />}
        bodyClassName="grid grid-cols-2 gap-3 p-4 md:grid-cols-4"
      >
        <Metric label="Car time" value={b.car_time_ms.toFixed(0)} unit="ms" />
        <Metric label="Drag" value={b.drag_ms.toFixed(1)} unit="ms" />
        <Metric label="Rolling" value={b.rolling_ms.toFixed(1)} unit="ms" />
        <Metric
          label="Mass above 50 g"
          value={b.mass_above_minimum_ms.toFixed(1)}
          unit="ms"
          hint="India NF T3.6 minimum 50.0 g"
        />
      </Panel>
      <Panel
        title="What moves the time (±10%)"
        description="Change in race time when each input moves 10% down (left) or up (right)."
        bodyClassName="flex flex-col gap-2 p-4"
      >
        {data.tornado.map((r) => (
          <div key={r.input} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-2 text-xs">
            <span>{INPUT_LABEL[r.input] ?? r.input}</span>
            <span className="relative h-3 rounded-sm bg-muted" aria-hidden>
              {[r.low_ms, r.high_ms].map((v, side) => (
                <span
                  key={side === 0 ? "low" : "high"}
                  className={cn("absolute top-0 h-full", v > 0 ? "bg-risk" : "bg-ok")}
                  style={{
                    left: v < 0 ? `${50 - (Math.abs(v) / widest) * 50}%` : "50%",
                    width: `${(Math.abs(v) / widest) * 50}%`,
                  }}
                />
              ))}
              <span className="absolute top-0 left-1/2 h-full w-px bg-line-strong" />
            </span>
            <span className="tabular text-right font-mono text-muted-foreground">
              {ms(r.low_ms)} / {ms(r.high_ms)} ms
            </span>
          </div>
        ))}
      </Panel>
      <Panel
        title="What each change is worth"
        description="For the verbal presentation: milliseconds per unit of design change."
        bodyClassName="grid grid-cols-2 gap-3 p-4 md:grid-cols-4"
      >
        <Metric label="Per gram" value={ms(x.ms_per_gram)} unit="ms" />
        <Metric label="Per cm² of CdA" value={ms(x.ms_per_cm2_cda)} unit="ms" />
        <Metric label="Per 0.001 Crr" value={ms(x.ms_per_0p001_crr)} unit="ms" />
        <Metric label="Per 1% thrust" value={ms(x.ms_per_percent_thrust)} unit="ms" />
      </Panel>
    </div>
  );
}
