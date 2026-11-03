import { describe, expect, it } from "vitest";
import { parseReactionHistory, reactionStats } from "./reactionHistory";

describe("browser practice history", () => {
  it("restores legacy numeric entries without inventing timestamps or false-start counts", () => {
    const attempts = parseReactionHistory("[100,200,300]");
    const stats = reactionStats(attempts);
    expect(attempts.every((a) => a.at === null)).toBe(true);
    expect(stats.median).toBe(200);
    expect(stats.sd).toBe(100);
    expect(stats.p10).toBe(120);
    expect(stats.p90).toBe(280);
    expect(stats.recordedAttempts).toBe(0);
    expect(stats.legacy).toBe(3);
  });
  it("counts false starts without treating them as zero-ms reactions", () => {
    const attempts = parseReactionHistory(
      JSON.stringify([
        { id: "a", at: "2026-11-03T00:00:00Z", outcome: "false_start", ms: null },
        { id: "b", at: "2026-11-03T00:01:00Z", outcome: "reaction", ms: 220 },
      ]),
    );
    const stats = reactionStats(attempts);
    expect(stats.count).toBe(1);
    expect(stats.median).toBe(220);
    expect(stats.sd).toBeNull();
    expect(stats.falseStarts).toBe(1);
    expect(stats.recordedAttempts).toBe(2);
  });
  it("does not interpret malformed or negative local data as valid latency", () => {
    expect(parseReactionHistory("not json")).toEqual([]);
    expect(parseReactionHistory("[100,-1]")).toEqual([]);
    expect(parseReactionHistory('[{"id":"a","at":null,"outcome":"reaction","ms":null}]')).toEqual(
      [],
    );
    expect(reactionStats([]).mean).toBeNull();
  });
});
