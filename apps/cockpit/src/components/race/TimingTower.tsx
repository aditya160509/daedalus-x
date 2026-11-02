"use client";

import DriverTag from "./timing/DriverTag";
import DriverGap from "./timing/DriverGap";
import DriverLapTime from "./timing/DriverLapTime";
import { Panel } from "@/components/ui/primitives";
import { clampedSampleAt, miniSectorTimes, type DistanceTrace } from "./raceMath";
import { MiniSectors, SectorLegend } from "./timing/MiniSectors";

/** Eight equal-distance sectors; incomplete sectors are never displayed as completed. */
export function TimingTower({
  primary,
  ghost,
  lengthM,
  primaryTime,
  ghostTime,
  cursor,
  primaryName = "Car",
  ghostName = "Comparison",
}: {
  primary: DistanceTrace;
  ghost: DistanceTrace | null;
  lengthM: number;
  primaryTime: number | null;
  ghostTime: number | null;
  cursor?: number;
  primaryName?: string;
  ghostName?: string;
}) {
  const a = miniSectorTimes(primary, lengthM, 8);
  const b = ghost ? miniSectorTimes(ghost, lengthM, 8) : null;
  const distance = (trace: DistanceTrace) =>
    cursor === undefined
      ? (trace.position.at(-1) ?? 0)
      : (clampedSampleAt(cursor, trace.time, trace.position) ?? 0);
  const rows = [
    {
      name: primaryName,
      time: primaryTime,
      sectors: a,
      other: b,
      distance: distance(primary),
      lane: "A",
    },
    ...(ghost && b
      ? [
          {
            name: ghostName,
            time: ghostTime,
            sectors: b,
            other: a,
            distance: distance(ghost),
            lane: "B",
          },
        ]
      : []),
  ].toSorted((x, y) => {
    const difference = y.distance - x.distance;
    return cursor !== undefined && Math.abs(difference) > 1e-6
      ? difference
      : (x.time ?? Infinity) - (y.time ?? Infinity);
  });
  const lead = Math.min(...rows.map((row) => row.time ?? Infinity));
  return (
    <Panel title="Timing · 8 mini-sectors" bodyClassName="p-0">
      <div className="divide-y divide-border/50">
        {rows.map((row, index) => {
          const completed = Math.min(8, Math.floor((row.distance / lengthM) * 8 + 1e-7));
          const crossed = cursor === undefined || (row.time !== null && cursor >= row.time);
          return (
            <div key={row.lane} className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <DriverTag
                  position={index + 1}
                  short={row.lane}
                  teamColor={row.lane === "A" ? "257985" : "596675"}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium" title={row.name}>
                  {row.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DriverLapTime
                  last={{
                    Value: crossed
                      ? row.time === null
                        ? "DNF"
                        : `${row.time.toFixed(4)} s`
                      : `${row.distance.toFixed(2)} m`,
                    OverallFastest: crossed && row.time === lead,
                  }}
                  best={{
                    Value:
                      crossed && Number.isFinite(lead)
                        ? `${lead.toFixed(4)} s best`
                        : `${completed}/8 completed`,
                  }}
                  hasFastest={crossed && row.time === lead}
                />
                <DriverGap
                  sessionPart={undefined}
                  timingDriver={{
                    GapToLeader:
                      crossed && row.time !== null && Number.isFinite(lead)
                        ? row.time === lead
                          ? "Leader"
                          : `+${((row.time - lead) * 1000).toFixed(2)} ms to leader`
                        : index === 0
                          ? "Leader"
                          : `${Math.max(0, rows[0].distance - row.distance).toFixed(2)} m behind`,
                    IntervalToPositionAhead: {
                      Value:
                        index === 0
                          ? "—"
                          : crossed && rows[index - 1].time !== null && row.time !== null
                            ? `+${((row.time - rows[index - 1].time!) * 1000).toFixed(2)} ms`
                            : `${Math.max(0, rows[index - 1].distance - row.distance).toFixed(2)} m`,
                    },
                  }}
                />
              </div>
              <MiniSectors times={row.sectors} other={row.other} completed={completed} />
            </div>
          );
        })}
      </div>
      <div className="border-t px-3 py-2">
        <SectorLegend />
      </div>
    </Panel>
  );
}
