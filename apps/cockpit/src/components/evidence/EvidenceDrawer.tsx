"use client";

import { useQuery } from "@tanstack/react-query";
import { FileStack, ShieldCheck, ShieldX } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { listEvidence, type EvidenceRow } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<EvidenceRow | null>(null);
  const query = useDeferredValue(q);
  const rows = useQuery({
    queryKey: ["evidence", query],
    queryFn: () => listEvidence(query),
    enabled: open,
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
      <SheetContent className="flex flex-col sm:max-w-xl">
        <div className="flex items-center gap-2 border-b p-4 pr-12">
          <FileStack className="size-4 text-muted-foreground" aria-hidden />
          <SheetTitle className="text-sm font-medium">Evidence</SheetTitle>
          {rows.data && (
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search records"
          aria-label="Search evidence"
          className="mx-4 mt-3 h-8 rounded-md border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
      </SheetContent>
    </Sheet>
  );
}
