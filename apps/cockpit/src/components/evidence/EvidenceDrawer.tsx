"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl, Skeleton } from "@/components/ui/primitives";
import { useQuery } from "@tanstack/react-query";
import { FileStack, ShieldCheck, ShieldX } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { listEvidence, type EvidenceRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const EvidenceLineage = dynamic(() => import("./EvidenceLineage"), {
  ssr: false,
  loading: () => <Skeleton className="m-4 h-96" />,
});

export const OPEN_EVIDENCE = "daedalus:open-evidence";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** One-line summary of a record body: the first few scalar fields. */
function summary(r: EvidenceRow): string {
  return Object.entries(r.body)
    .filter(
      ([k, v]) =>
        !k.endsWith("_at") &&
        !k.endsWith("_id") &&
        (typeof v === "string" || typeof v === "number"),
    )
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, " ")} ${String(v).slice(0, 24)}`)
    .join(" · ");
}

/** ATLAS timeline: every stored record newest first, grouped by day, with its hash check. Opens with E. */
export function EvidenceDrawer() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"timeline" | "lineage">("timeline");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<EvidenceRow | null>(null);
  const query = useDeferredValue(q);
  const rows = useQuery({
    queryKey: ["evidence", query],
    queryFn: () => listEvidence(query),
    enabled: open && mode === "timeline",
  });

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        e.key !== "e" ||
        e.metaKey ||
        e.ctrlKey ||
        t?.closest("input,textarea,select,[contenteditable]")
      )
        return;
      setOpen((o) => !o);
    };
    window.addEventListener(OPEN_EVIDENCE, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVIDENCE, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const groups = new Map<string, EvidenceRow[]>();
  for (const r of rows.data ?? [])
    groups.set(day(r.created_at), [...(groups.get(day(r.created_at)) ?? []), r]);
  const broken = (rows.data ?? []).filter((r) => !r.verified).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        className={cn("flex flex-col", mode === "lineage" ? "sm:max-w-7xl" : "sm:max-w-xl")}
      >
        <div className="flex items-center gap-2 border-b p-4 pr-12">
          <FileStack className="size-4 text-muted-foreground" aria-hidden />
          <SheetTitle className="text-sm font-medium">Evidence</SheetTitle>
          {mode === "timeline" && rows.data && (
            <span
              className={cn(
                "ml-auto flex items-center gap-1 text-xs",
                broken ? "text-destructive" : "text-ok",
              )}
            >
              {broken ? <ShieldX className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
              {broken ? `${broken} broken` : `${rows.data.length} verified`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
          <SegmentedControl
            label="Evidence view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "timeline", label: "Timeline" },
              { value: "lineage", label: "Lineage" },
            ]}
          />
          <span className="text-[10px] text-muted-foreground">Stored records · read only</span>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search records"
          aria-label="Search evidence"
          className="mx-4 mt-3 h-8 rounded-md border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {mode === "lineage" ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="min-h-80 min-w-0 flex-1">
              <EvidenceLineage query={query} selected={sel?.id} onSelect={setSel} />
            </div>
            {sel && (
              <aside className="max-h-64 w-full overflow-y-auto border-t p-4 md:max-h-none md:w-80 md:shrink-0 md:border-t-0 md:border-l">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium">{sel.kind}</h3>
                  <Button size="xs" variant="ghost" onClick={() => setSel(null)}>
                    Close details
                  </Button>
                </div>
                <p className="mb-2 break-all font-mono text-[10px] text-muted-foreground">
                  {sel.id}
                </p>
                <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed text-text-2">
                  {JSON.stringify(sel.body, null, 2)}
                </pre>
              </aside>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {rows.isPending && <Skeleton className="h-48" />}
            {rows.isError && (
              <p role="alert" className="text-xs">
                Could not load records.{" "}
                <Button variant="link" onClick={() => void rows.refetch()}>
                  Retry
                </Button>
              </p>
            )}
            {rows.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">No records yet.</p>
            )}
            {[...groups].map(([d, items]) => (
              <section key={d} className="mb-4">
                <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {d}
                </h3>
                <ol className="relative ml-1.5 border-l">
                  {items.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSel(sel?.id === r.id ? null : r)}
                        aria-label={`${r.kind} ${time(r.created_at)}, show details`}
                        aria-expanded={sel?.id === r.id}
                        className="group relative w-full rounded-md py-1.5 pr-2 pl-4 text-left hover:bg-accent"
                      >
                        <span
                          className={cn(
                            "absolute top-3 -left-[4.5px] size-2 rounded-full ring-2 ring-card",
                            r.verified ? "bg-brand" : "bg-destructive",
                          )}
                          aria-hidden
                        />
                        <span className="flex items-baseline gap-2 text-xs">
                          <span className="font-medium">{r.kind}</span>
                          <span className="truncate text-muted-foreground">{summary(r)}</span>
                          <span className="tabular ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                            {time(r.created_at)}
                          </span>
                        </span>
                      </button>
                      {sel?.id === r.id && (
                        <pre className="mb-2 ml-4 max-h-64 overflow-auto rounded-md bg-black/30 p-2 font-mono text-[10px] leading-relaxed text-text-2">
                          {JSON.stringify(r.body, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
