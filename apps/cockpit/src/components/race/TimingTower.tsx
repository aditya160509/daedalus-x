"use client";

import { Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { miniSectorTimes, type DistanceTrace } from "./raceMath";

const N = 8;

/**
 * F1 TV-style timing tower: total time, gap and 8 mini-sectors per car.
 * Purple = faster of the two in that sector, yellow = slower (single car: all green).
 */
export function TimingTower({
  primary,
  ghost,
  lengthM,
  primaryTime,
  ghostTime,
}: {
  primary: DistanceTrace;
  ghost: DistanceTrace | null;
  lengthM: number;
  primaryTime: number | null;
  ghostTime: number | null;
}) {
  const a = miniSectorTimes(primary, lengthM, N);
  const b = ghost ? miniSectorTimes(ghost, lengthM, N) : null;
  const tone = (mine: number | null, other: number | null | undefined) =>
    mine == null
      ? "bg-white/5"
      : other == null
        ? "bg-ok"
        : mine <= other
          ? "bg-[#a855f7]"
          : "bg-yellow-400";
  const rows = [
    { name: "Car", time: primaryTime, s: a, o: b },
    ...(b ? [{ name: "Ghost", time: ghostTime, s: b, o: a }] : []),
  ].sort((x, y) => (x.time ?? Infinity) - (y.time ?? Infinity));
  const lead = rows[0]?.time ?? null;

  return (
    <Panel title="Timing" bodyClassName="p-0">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-b border-border/50 last:border-0">
              <td className="tabular w-6 py-2 pl-4 font-mono text-muted-foreground">{i + 1}</td>
              <td className="py-2 font-medium">{r.name}</td>
              <td className="px-2">
                <div className="flex gap-0.5" aria-label={`${r.name} mini-sectors`}>
                  {r.s.map((v, k) => (
                    <span
                      key={k}
                      title={v != null ? `S${k + 1} ${(v * 1000).toFixed(1)} ms` : `S${k + 1} —`}
                      className={cn("h-3 w-2.5 rounded-[2px]", tone(v, r.o?.[k]))}
                    />
                  ))}
                </div>
              </td>
              <td className="tabular pr-4 text-right font-mono">
                {r.time == null
                  ? "DNF"
                  : i === 0
                    ? r.time.toFixed(3)
                    : `+${((r.time - (lead ?? 0)) * 1000).toFixed(0)} ms`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
