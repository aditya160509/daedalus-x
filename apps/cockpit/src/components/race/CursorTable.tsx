"use client";

import { Table } from "@/components/ui/table";
import type { TelemetryTrack } from "@/components/charts/TelemetryChart";
import { deltaReading, sampleAt } from "./raceMath";
import { cn } from "@/lib/utils";

function fmt(value: number | null, signed = false): string {
  if (value === null) return "—";
  const text = Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(2);
  return signed && value > 0 ? `+${text}` : text;
}

/** Right-hand value table: one row per channel, with cursor, A, B and Δ(B−A). */
export function CursorTable({
  time,
  tracks,
  cursor,
  delta,
}: {
  time: number[];
  tracks: TelemetryTrack[];
  cursor: number;
  delta: { a: number; b: number };
}) {
  const dt = delta.b - delta.a;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-foreground">Cursor</span>
        <span className="tabular font-mono text-[11px] text-brand">{cursor.toFixed(3)} s</span>
      </div>
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px]">
        <span className="text-muted-foreground">Δt B−A</span>
        <span
          className={cn(
            "tabular font-mono",
            dt < 0 ? "text-ok" : dt > 0 ? "text-risk" : "text-text-2",
          )}
        >
          {dt >= 0 ? "+" : ""}
          {(dt * 1000).toFixed(1)} ms
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table aria-label="Cursor values" className="w-full text-[11px]">
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1 text-left font-medium">
                Channel
              </th>
              <th scope="col" className="px-1 py-1 text-right font-medium">
                Cursor
              </th>
              <th scope="col" className="px-1 py-1 text-right font-medium">
                A
              </th>
              <th scope="col" className="px-1 py-1 text-right font-medium">
                B
              </th>
              <th scope="col" className="px-2 py-1 text-right font-medium">
                Δ
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) =>
              track.series.map((series) => {
                const now = sampleAt(cursor, time, series.values);
                const pair = deltaReading(delta.a, delta.b, time, series.values);
                return (
                  <tr key={`${track.id}-${series.label}`} className="border-t border-line/60">
                    <td className="px-3 py-1 whitespace-nowrap">
                      <span
                        className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                        style={{ background: series.color ?? track.color }}
                      />
                      <span className="text-text-2">{series.label}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">{track.unit}</span>
                    </td>
                    <td className="tabular px-1 py-1 text-right font-mono text-text">{fmt(now)}</td>
                    <td className="tabular px-1 py-1 text-right font-mono text-muted-foreground">
                      {fmt(pair.a)}
                    </td>
                    <td className="tabular px-1 py-1 text-right font-mono text-muted-foreground">
                      {fmt(pair.b)}
                    </td>
                    <td className="tabular px-2 py-1 text-right font-mono text-text-2">
                      {fmt(pair.delta, true)}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </Table>
      </div>
      <p className="border-t px-3 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
        Linear interpolation between samples. Drag A or B on the chart, or focus a handle and use
        the arrow keys.
      </p>
    </div>
  );
}
