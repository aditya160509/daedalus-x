"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCfdRuns, type RenderView, renderUrl } from "@/lib/api";
import { useSelectedRun } from "@/lib/runSelection";
import { cn } from "@/lib/utils";

/** Prefer the active solved run, then the lowest-Cd solved run. */
export function useHeroRun(): string | undefined {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, staleTime: 60_000 });
  const [selected] = useSelectedRun();
  const solved = runs.data?.filter((r) => r.state === "succeeded" && r.has_viz && r.cd != null);
  return (
    solved?.find((run) => run.run_id === selected)?.run_id ??
    solved?.toSorted((a, b) => (a.cd ?? 0) - (b.cd ?? 0))[0]?.run_id
  );
}

/** Server-rendered photo-style still (first request renders it, ~10 s; then cached). */
export function HeroImage({
  runId,
  view = "iso",
  fit = "cover",
  className,
}: {
  runId: string;
  view?: RenderView;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const src = renderUrl(runId, view);
  const [state, setState] = useState<{ src: string; status: "loading" | "ok" | "error" }>({
    src,
    status: "loading",
  });
  const status = state.src === src ? state.status : "loading";
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-background", className)}>
      {/* oxlint-disable-next-line nextjs/no-img-element -- a server PNG, not a static asset */}
      <img
        key={src}
        src={src}
        alt={`CFD render of ${runId}, ${view} view: surface pressure and streamlines`}
        onLoad={() => setState({ src, status: "ok" })}
        onError={() => setState({ src, status: "error" })}
        className={cn(
          "size-full transition-opacity",
          fit === "cover" ? "object-cover" : "object-contain",
          status !== "ok" && "opacity-0",
        )}
      />
      {status !== "ok" && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
          {status === "loading" ? "Rendering flow image…" : "Render unavailable for this run"}
        </div>
      )}
    </div>
  );
}
