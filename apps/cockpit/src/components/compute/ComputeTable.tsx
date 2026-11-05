"use client";

import { Table } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { listCfdCompute } from "@/lib/api-extra";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";

const fmtInt = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-GB"));
const fmtSec = (v: number | null) => (v == null ? "—" : `${v.toFixed(0)} s`);
const fmtHours = (v: number | null) => (v == null ? "—" : `${(v / 3600).toFixed(2)} h`);

/** One row per CFD run: cells, iterations, solver wall time and status, from the run logs. */
export function ComputeTable() {
  const query = useQuery({
    queryKey: ["cfd-compute"],
    queryFn: listCfdCompute,
    refetchInterval: 20_000,
  });
  const rows = query.data ?? [];
  const totalWall = rows.reduce((sum, r) => sum + (r.solver_wall_s ?? 0), 0);

  return (
    <Panel
      title="Compute and wall time"
      description="Per CFD run, read from the OpenFOAM logs. Wall time is the solver ClockTime."
      actions={
        <ProvenanceBadge value="measured" title="Wall-clock timings recorded by the job runner" />
      }
      bodyClassName="p-0"
    >
      {query.isError ? (
        <p role="alert" className="p-3 text-xs text-danger">
          {query.error instanceof Error ? query.error.message : "Could not load run logs"}
        </p>
      ) : query.isPending ? (
        <div className="h-40 animate-pulse bg-surface-2" />
      ) : rows.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">No CFD runs have logs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table aria-label="Compute wall times" className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="px-3 py-2 font-normal">
                  run
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  status
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  acceptance
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  cells
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  iterations
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  solver wall
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  solver CPU
                </th>
              </tr>
            </thead>
            <tbody className="tabular font-mono">
              {rows.map((r) => (
                <tr key={r.run_id} className="border-b last:border-0">
                  <td className="px-3 py-1.5 font-sans">{r.run_id}</td>
                  <td className="px-3 py-1.5 font-sans">{r.status}</td>
                  <td className="px-3 py-1.5 font-sans">{r.acceptance ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{fmtInt(r.cells)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtInt(r.iterations)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSec(r.solver_wall_s)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtSec(r.solver_cpu_s)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="px-3 py-2 text-2xs text-muted-foreground">
            Total solver wall time across runs with a log: {fmtHours(totalWall)}. Runs without a
            solver log show a dash.
          </p>
        </div>
      )}
    </Panel>
  );
}
