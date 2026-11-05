"use client";

import { Table } from "@/components/ui/table";
import type { RaceSimulation } from "@/lib/api";
import { speedTrap, timingCsv, timingJson } from "@/lib/raceTiming";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";

function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const fmt = (v: number | null, digits = 2) => (v == null ? "—" : v.toFixed(digits));

/** Speed trap values read from the trace, plus CSV and JSON export of the same rows. */
export function TimingPanel({ sim }: { sim: RaceSimulation }) {
  const trap = speedTrap(sim);
  const stem = `race-timing-${sim.model}-${sim.time_s == null ? "dnf" : sim.time_s.toFixed(3)}s`;
  const rows = [
    {
      k: "peak",
      ms: trap.peakMs,
      t: trap.peakT,
    },
    {
      k: "finish",
      ms: trap.finishMs,
      t: trap.finishT,
    },
  ];
  return (
    <Panel
      title="Speed trap"
      description="Peak and finish speed from the simulated trace."
      actions={<ProvenanceBadge value="predicted" />}
      bodyClassName="p-3"
    >
      <div className="flex flex-col gap-3">
        <Table aria-label="Race timing channels" className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="text-left font-normal">
                point
              </th>
              <th scope="col" className="text-right font-normal">
                m/s
              </th>
              <th scope="col" className="text-right font-normal">
                km/h
              </th>
              <th scope="col" className="text-right font-normal">
                at, s
              </th>
            </tr>
          </thead>
          <tbody className="tabular font-mono">
            {rows.map((r) => (
              <tr key={r.k} className="border-t">
                <td className="py-1 font-sans capitalize">{r.k}</td>
                <td className="text-right">{fmt(r.ms)}</td>
                <td className="text-right">{fmt(r.ms == null ? null : r.ms * 3.6, 1)}</td>
                <td className="text-right">{fmt(r.t, 3)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => download(`${stem}.csv`, "text/csv", timingCsv(sim))}
          >
            Download CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download(`${stem}.json`, "application/json", timingJson(sim))}
          >
            Download JSON
          </Button>
        </div>
      </div>
    </Panel>
  );
}
