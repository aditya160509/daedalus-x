export type RunSummary = {
  run_id: string;
  state: string;
  cd: number | null;
  acceptance: string | null;
  has_viz: boolean;
};

/**
 * Best accepted run first (lowest Cd), then the best solved run, so a rejected run can never be
 * the default. A user selection still wins, but the rejected banner stays visible.
 */
export function defaultRunId(runs: readonly RunSummary[]): string | null {
  const solved = runs.filter(
    (r) => r.state === "succeeded" && r.has_viz && r.acceptance !== "rejected",
  );
  const byCd = (a: RunSummary, b: RunSummary) => (a.cd ?? Infinity) - (b.cd ?? Infinity);
  const accepted = solved.filter((r) => r.acceptance === "accepted" && r.cd != null).toSorted(byCd);
  const measured = solved.filter((r) => r.cd != null).toSorted(byCd);
  return accepted[0]?.run_id ?? measured[0]?.run_id ?? solved[0]?.run_id ?? null;
}
