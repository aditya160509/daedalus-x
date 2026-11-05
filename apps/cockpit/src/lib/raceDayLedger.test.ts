import { describe, expect, it } from "vitest";
import { calibrationTimingFile, laneIntervals, type TimingRun } from "./raceDayLedger";

const rows: TimingRun[] = [
  { id: 1, lane: "A", car_s: 1, reaction_s: null, at: "", session: "Finals" },
  { id: 2, lane: "B", car_s: 1.5, reaction_s: 0.2, at: "", session: "Finals" },
  { id: 3, lane: "A", car_s: 1.125, reaction_s: 0.1, at: "", session: "Finals" },
];

describe("race-day timing ledger", () => {
  it("tracks intervals against the previous run in the same lane", () => {
    expect(laneIntervals(rows)).toEqual([null, null, 0.125]);
  });
  it("prepares only the selected lane and preserves car-only times", async () => {
    const file = calibrationTimingFile(rows, "Finals", "A");
    expect(file.name).toBe("race-day-finals-lane-A.csv");
    expect(await file.text()).toBe("run_no,lane,time [s],reaction [s]\n1,A,1,\n3,A,1.125,0.1");
  });
});
