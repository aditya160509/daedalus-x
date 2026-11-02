"use client";

import { useQuery } from "@tanstack/react-query";
import { forgeSheetUrl, getForgeChecks, listDesigns, type RuleCheck } from "@/lib/api";
import { Panel, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STATE: Record<RuleCheck["state"], { label: string; dot: string }> = {
  fail_cad: { label: "Fail", dot: "bg-destructive" },
  at_risk: { label: "Risk", dot: "bg-risk" },
  pass_cad_only: { label: "Pass", dot: "bg-ok" },
  manual_review: { label: "Measure", dot: "bg-line-strong" },
};
const ORDER: RuleCheck["state"][] = ["fail_cad", "at_risk", "manual_review", "pass_cad_only"];

const limit = (c: RuleCheck) =>
  c.min != null && c.max != null
    ? `${c.min}–${c.max}`
    : c.min != null
      ? `≥ ${c.min}`
      : `≤ ${c.max}`;

/** FORGE: CAD-only rule checks with margins; non-computable rules stay "Measure", never green. */
export function LegalPanel({ design: picked }: { design?: string } = {}) {
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  const design = picked ?? designs.data?.[0]?.design_id;
  const q = useQuery({
    queryKey: ["forge", design],
    queryFn: () => getForgeChecks(design!),
    enabled: !!design,
  });
  const checks = (q.data?.checks ?? []).toSorted(
    (a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state),
  );
  const fails = checks.filter((c) => c.state === "fail_cad").length;
  const risks = checks.filter((c) => c.state === "at_risk").length;
  const points = q.data?.points_at_risk;

  return (
    <Panel
      title="Legal · FORGE"
      actions={
        q.data && (
          <span
            className={cn(
              "text-xs font-medium",
              fails ? "text-destructive" : risks ? "text-risk" : "text-ok",
            )}
          >
            {fails ? `${fails} fail` : risks ? `${risks} at risk` : "✓ CAD pass"}
            {points && (points.failing_points > 0 || points.at_risk_points > 0) && (
              <span className="tabular ml-2 font-mono">
                −{points.failing_points} pts
                {points.at_risk_points > 0 && ` (${points.at_risk_points} at risk)`}
              </span>
            )}
          </span>
        )
      }
      bodyClassName="overflow-y-auto"
    >
      {!q.data ? (
        <Skeleton className="m-4 h-40" />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-2xs text-muted-foreground">
            <span>
              {q.data.revision}
              {points ? ` · ${points.manual_review_rules} rules to measure by hand` : ""}
            </span>
            {design && (
              <a
                href={forgeSheetUrl(design)}
                target="_blank"
                rel="noreferrer"
                className="rounded px-1.5 py-0.5 text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Scrutineering sheet (PDF)
              </a>
            )}
          </div>
          <table className="w-full text-xs">
            <tbody>
              {checks.map((c) => (
                <tr
                  key={c.rule_id}
                  className="border-b border-border/50 last:border-0"
                  title={`${c.rule_id} (p. ${c.page})${c.note ? ` · ${c.note}` : ""}`}
                >
                  <td className="py-1.5 pl-4">
                    <span
                      className={cn("mr-2 inline-block size-1.5 rounded-full", STATE[c.state].dot)}
                      aria-hidden
                    />
                    <span className="sr-only">{STATE[c.state].label}: </span>
                    {c.name}
                  </td>
                  <td className="tabular px-2 text-right font-mono text-muted-foreground">
                    {c.value != null ? c.value.toFixed(1) : "—"}
                    <span className="opacity-60"> / {limit(c)}</span>
                  </td>
                  <td
                    className={cn(
                      "tabular pr-4 text-right font-mono",
                      c.state === "fail_cad" && "text-destructive",
                      c.state === "at_risk" && "text-risk",
                    )}
                  >
                    {c.margin != null
                      ? `${c.margin > 0 ? "+" : ""}${c.margin.toFixed(1)} ${c.unit}`
                      : STATE[c.state].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}
