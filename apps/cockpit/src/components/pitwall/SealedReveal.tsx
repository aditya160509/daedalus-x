"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useState } from "react";
import { listPredictions, scorePrediction } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Race-day reveal: the newest sealed prediction, then the measured time scored against it. */
export function SealedReveal() {
  const preds = useQuery({ queryKey: ["predictions"], queryFn: listPredictions });
  const [measured, setMeasured] = useState("");
  const p = preds.data?.at(-1);
  const score = useMutation({ mutationFn: (v: number) => scorePrediction(p!.prediction_id, v) });

  if (!p) return <p className="p-4 text-xs text-muted-foreground">No sealed prediction yet.</p>;
  const half = (p.interval_high.value - p.interval_low.value) / 2;
  return (
    <div className="flex h-full flex-col justify-between gap-3 p-4">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          <span className="truncate font-mono" title={p.manifest_hash ?? ""}>
            {p.manifest_hash?.slice(7, 19) ?? "unsealed"}
          </span>
        </div>
        <div className="tabular mt-2 font-mono text-[32px] leading-none">
          {p.predicted.value.toFixed(3)}
          <span className="ml-1 text-sm text-muted-foreground">± {half.toFixed(3)} s</span>
        </div>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = Number(measured);
          if (v > 0) score.mutate(v);
        }}
      >
        <input
          aria-label="Measured race time in seconds"
          inputMode="decimal"
          placeholder="actual s"
          value={measured}
          onChange={(e) => setMeasured(e.target.value)}
          className="tabular h-8 w-24 rounded-md border bg-transparent px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-brand px-3 text-xs font-medium text-black"
        >
          Reveal
        </button>
        {score.data && (
          <span
            className={cn(
              "ml-auto text-sm font-medium",
              score.data.inside_interval ? "text-ok" : "text-destructive",
            )}
          >
            {score.data.inside_interval ? "✓ inside" : "✗ outside"}
          </span>
        )}
      </form>
    </div>
  );
}
