"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listDesigns, listCfdRuns, listJobs, submitCfdJob } from "@/lib/api";
import { suggestRunId } from "./jobMath";

export function NewRunDialog() {
  const [open, setOpen] = useState(false);
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: listJobs, enabled: open });
  const [selected, setSelected] = useState("");
  const design = selected || designs.data?.[0]?.design_id || "";
  const [speed, setSpeed] = useState(20);
  const [fidelity, setFidelity] = useState<"quick" | "final">("quick");
  const [procs, setProcs] = useState(8);
  const [customId, setCustomId] = useState("");
  const taken = [
    ...(runs.data?.map((r) => r.run_id) ?? []),
    ...(jobs.data?.flatMap((j) => (typeof j.params.run === "string" ? [j.params.run] : [])) ?? []),
  ];
  const run = customId || suggestRunId(design, speed, fidelity, taken);
  const cache = useQueryClient();
  const submit = useMutation({
    mutationFn: submitCfdJob,
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
      setCustomId("");
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New run
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Queue a CFD run</DialogTitle>
          <DialogDescription>
            Launch approved local computation. One CFD job runs at a time; the worker caps MPI ranks
            to reserve two CPU cores.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({ design, run, speed, fidelity, procs });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="job-design">Design</Label>
            <select
              id="job-design"
              value={design}
              onChange={(e) => {
                setSelected(e.target.value);
                setCustomId("");
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {!design && <option value="">No imported designs</option>}
              {designs.data?.map((d) => (
                <option key={d.design_id} value={d.design_id}>
                  {d.design_id}
                </option>
              ))}
            </select>
            {designs.isError && (
              <p role="alert" className="text-xs text-danger">
                Cannot load designs. Start the local API.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="job-speed">Speed (m/s)</Label>
              <Input
                id="job-speed"
                type="number"
                min="0.1"
                max="99"
                step="0.1"
                required
                value={speed}
                onChange={(e) => setSpeed(e.target.valueAsNumber)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="job-procs">Requested MPI ranks</Label>
              <Input
                id="job-procs"
                type="number"
                min="1"
                max="8"
                required
                value={procs}
                onChange={(e) => setProcs(e.target.valueAsNumber)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="job-fidelity">Fidelity</Label>
            <select
              id="job-fidelity"
              value={fidelity}
              onChange={(e) => setFidelity(e.target.value === "final" ? "final" : "quick")}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="quick">Quick screening</option>
              <option value="final">Final configuration</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="job-run-id">New run ID</Label>
            <Input
              id="job-run-id"
              required
              pattern="[a-z0-9_]{3,64}"
              value={run}
              onChange={(e) => setCustomId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Existing cases are never overwritten. Solver success does not imply scientific
              acceptance.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Worker required: <code>uv run daedalus jobs worker</code>. Do not run CFD alongside a
            dev server/browser on this Mac; queue now and run the worker after closing the UI
            servers.
          </p>
          {submit.error && (
            <p role="alert" className="text-sm text-danger">
              {submit.error.message}
            </p>
          )}
          <Button disabled={!design || submit.isPending} type="submit">
            {submit.isPending ? "Queuing…" : "Approve and queue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
