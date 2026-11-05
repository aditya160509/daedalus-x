import { z } from "zod";

export const RACE_DAY_KEY = "daedalus.raceday.runs";
export const DEFAULT_SESSION = "Session 1";

const row = z.object({
  id: z.number(),
  lane: z.enum(["A", "B"]),
  car_s: z.number().positive(),
  reaction_s: z.number().nonnegative().nullable(),
  at: z.string(),
  session: z.string().min(1).default(DEFAULT_SESSION),
});
export type TimingRun = z.infer<typeof row>;

export function readRaceDayLedger(): TimingRun[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RACE_DAY_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.flatMap((value: unknown) => {
          const run = row.safeParse(value);
          return run.success ? [run.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function laneIntervals(runs: readonly TimingRun[]): (number | null)[] {
  const previous: Partial<Record<TimingRun["lane"], number>> = {};
  return runs.map((run) => {
    const last = previous[run.lane];
    previous[run.lane] = run.car_s;
    return last == null ? null : run.car_s - last;
  });
}

export function calibrationTimingFile(
  runs: TimingRun[],
  session: string,
  lane: TimingRun["lane"],
): File {
  const lines = runs.filter((r) => r.session === session && r.lane === lane);
  if (lines.length < 1 || lines.length > 30)
    throw new Error("Choose a lane with 1–30 runs from one session.");
  const csv = [
    "run_no,lane,time [s],reaction [s]",
    ...lines.map((r) => [r.id, r.lane, r.car_s, r.reaction_s ?? ""].join(",")),
  ].join("\n");
  const slug =
    session
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "session";
  return new File([csv], `race-day-${slug}-lane-${lane}.csv`, { type: "text/csv" });
}
