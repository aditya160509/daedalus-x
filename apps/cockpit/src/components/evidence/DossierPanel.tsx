"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ShieldCheck } from "lucide-react";
import { dossierMarkdownUrl, getDossier, type Dossier } from "@/lib/api";
import { Panel, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STATUS: Record<
  Dossier["checks"][number]["status"],
  { label: string; className: string }
> = {
  verified: { label: "Verified", className: "border-ok/30 bg-ok/10 text-ok" },
  partial: { label: "Partial", className: "border-risk/30 bg-risk/10 text-risk" },
  failed: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  no_evidence: {
    label: "No evidence",
    className: "border-border bg-secondary/50 text-muted-foreground",
  },
};

/** T34: the dossier the app can defend, built from the evidence store itself. */
export function DossierPanel() {
  const q = useQuery({ queryKey: ["vv-dossier"], queryFn: getDossier, staleTime: 30_000 });

  return (
    <Panel
      title="Verification & validation dossier"
      description="Every requirement is derived from stored records. Missing evidence is shown, never passed."
      actions={
        <a
          href={dossierMarkdownUrl}
          download="daedalus-x-vv-dossier.md"
          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Download className="size-3.5" aria-hidden />
          Dossier .md ↓
        </a>
      }
    >
      {q.isPending ? (
        <Skeleton className="m-4 h-40" />
      ) : q.isError ? (
        <p role="alert" className="p-4 text-xs text-destructive">
          {q.error.message}
        </p>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-ok">
              <ShieldCheck className="size-3.5" aria-hidden />
              {q.data.summary.verified} verified
            </span>
            <span className="rounded-full border border-risk/30 bg-risk/10 px-2 py-0.5 text-risk">
              {q.data.summary.partial} partial
            </span>
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">
              {q.data.summary.failed} failed
            </span>
            <span className="rounded-full border bg-secondary/50 px-2 py-0.5 text-muted-foreground">
              {q.data.summary.no_evidence} no evidence
            </span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {q.data.summary.outstanding} outstanding · {q.data.generated}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-3 font-medium">Requirement</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {q.data.checks.map((check) => (
                  <tr key={check.requirement_id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{check.title}</span>
                      <span className="mt-0.5 block text-muted-foreground">{check.claim}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={cn(
                          "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          STATUS[check.status].className,
                        )}
                      >
                        {STATUS[check.status].label}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {check.evidence_ids.length ? (
                        <span className="font-mono text-2xs">
                          {check.evidence_ids.slice(0, 3).join(", ")}
                          {check.evidence_ids.length > 3
                            ? ` +${check.evidence_ids.length - 3}`
                            : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {q.data.failures.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-medium text-destructive">Recorded failures</h3>
              <ul className="space-y-1 text-xs">
                {q.data.failures.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex gap-2">
                    <span className="font-mono text-2xs text-muted-foreground">{item.id}</span>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Limitations and outstanding validation ({q.data.limitations.length} limits,{" "}
              {q.data.outstanding.length} open)
            </summary>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {q.data.limitations.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {q.data.outstanding.length === 0 ? (
                  <li>No outstanding action is derived from the stored records.</li>
                ) : (
                  q.data.outstanding.map((gap) => (
                    <li key={gap.gap_id}>
                      {gap.action} <span className="font-mono text-2xs">({gap.entity_id})</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </details>
          <p className="text-2xs text-muted-foreground">{q.data.statement}</p>
        </div>
      )}
    </Panel>
  );
}
