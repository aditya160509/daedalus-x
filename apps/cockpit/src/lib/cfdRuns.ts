export type RunSummary = {
  run_id: string;
  state: string;
  cd: number | null;
  acceptance: string | null;
  has_viz: boolean;
};

/**
 * Default run for the Wind Tunnel. Best accepted run first (lowest Cd), then the best solved run
 * that is not rejected, then the latest solved run even if rejected. The rejected fallback is a
 * preview only: the view labels it "not accepted" and greys its numbers, so the tunnel is never
 * empty while no run has passed the gate. A user selection still wins.
 */
export function defaultRunId(runs: readonly RunSummary[]): string | null {
  const solved = runs.filter((r) => r.state === "succeeded" && r.has_viz);
  const byCd = (a: RunSummary, b: RunSummary) => (a.cd ?? Infinity) - (b.cd ?? Infinity);
  const accepted = solved.filter((r) => r.acceptance === "accepted" && r.cd != null).toSorted(byCd);
  const measured = solved.filter((r) => r.acceptance !== "rejected" && r.cd != null).toSorted(byCd);
  const unrejected = solved.filter((r) => r.acceptance !== "rejected");
  const latestRejected = solved.at(-1);
  return (
    accepted[0]?.run_id ??
    measured[0]?.run_id ??
    unrejected[0]?.run_id ??
    latestRejected?.run_id ??
    null
  );
}
