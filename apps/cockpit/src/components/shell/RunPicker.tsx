"use client";

import { useQuery } from "@tanstack/react-query";
import { listCfdRuns } from "@/lib/api";
import { useSelectedRun } from "@/lib/runSelection";
import { ProvenanceBadge } from "@/components/ui/primitives";

/** Header picker for the CFD run every workspace reads. Its values are CFD solver results. */
export function RunPicker() {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, refetchInterval: 15_000 });
  const [picked, setPicked] = useSelectedRun();
  const list = runs.data ?? [];
  if (runs.isPending) return <span className="h-7 w-40 animate-pulse rounded-md bg-surface-2" />;
  if (list.length === 0)
    return <span className="text-xs text-muted-foreground">No CFD runs yet</span>;
  const current = list.some((r) => r.run_id === picked) ? picked : list[0].run_id;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <select
        aria-label="CFD run"
        value={current ?? ""}
        onChange={(e) => setPicked(e.target.value)}
        className="h-7 min-w-0 max-w-24 rounded-md sm:max-w-40 xl:max-w-56 border bg-secondary/60 px-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {list.map((r) => (
          <option key={r.run_id} value={r.run_id}>
            {r.run_id}
          </option>
        ))}
      </select>
      <ProvenanceBadge value="simulated" title="Computed by a CFD solver run" />
    </div>
  );
}
