"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { listCfdRuns, RENDER_VIEWS, type RenderView, renderUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/** The lowest-Cd solved run with a flow field: the one the hero renders show. */
export function useHeroRun(): string | undefined {
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, staleTime: 60_000 });
  return runs.data
    ?.filter((r) => r.state === "succeeded" && r.has_viz && r.cd != null)
    .toSorted((a, b) => (a.cd ?? 0) - (b.cd ?? 0))[0]?.run_id;
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
    <div className={cn("relative overflow-hidden rounded-lg bg-black", className)}>
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

/** Wind Tunnel "Render" tab: hero still with view switcher and download. */
export function RenderPanel({ runId }: { runId: string }) {
  const [view, setView] = useState<RenderView>("iso");
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center gap-1">
        {RENDER_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs capitalize",
              view === v
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {v}
          </button>
        ))}
        <a
          href={renderUrl(runId, view)}
          download={`${runId}_${view}.png`}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Download className="size-3.5" /> PNG
        </a>
      </div>
      <HeroImage runId={runId} view={view} fit="contain" className="min-h-0 flex-1" />
    </div>
  );
}
