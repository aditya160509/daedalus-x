"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelJob, getJobLog, listJobs, type Job } from "@/lib/api";
import { LineChart } from "echarts/charts";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { elapsedSeconds, etaSeconds, parseResiduals, progressPercent } from "./jobMath";

echarts.use([LineChart]);

/** Initial residual per field on a log axis: the convergence monitor. */
function Residuals({ log }: { log: string }) {
  const series = parseResiduals(log);
  const names = Object.keys(series);
  const host = useECharts(() => {
    const t = chartTheme();
    const colors = [t.brand, t.risk, t.ok, "#a78bfa", "#f472b6", "#60a5fa", t.text2];
    return {
      animation: false,
      grid: { left: 44, right: 12, top: 24, bottom: 24 },
      legend: { top: 0, itemWidth: 10, itemHeight: 4, textStyle: { color: t.text2, fontSize: 10 } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => v.toExponential(2),
      },
      xAxis: { type: "value", ...chartAxis(t), min: "dataMin" },
      yAxis: {
        type: "log",
        ...chartAxis(t),
        axisLabel: { formatter: (v: number) => v.toExponential(0), color: t.muted, fontSize: 10 },
      },
      series: names.map((n, i) => ({
        name: n,
        type: "line",
        showSymbol: false,
        lineStyle: { width: 1.2, color: colors[i % colors.length] },
        itemStyle: { color: colors[i % colors.length] },
        data: series[n],
      })),
    };
  }, [log]);
  if (!names.length) return null;
  return <div ref={host} className="h-44 w-full" />;
}

function LogTail({ job }: { job: Job }) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let offset = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      try {
        const log = await getJobLog(job.id, offset);
        if (!active) return;
        offset = log.offset;
        setText((old) => (old + log.text).slice(-65536));
        setStage(log.stage_log);
        setProgress(progressPercent(log.iteration, log.end_time));
        setError("");
        if (log.has_more || job.state === "running" || job.state === "queued")
          timer = setTimeout(() => void read(), log.has_more ? 0 : 2000);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Cannot read job log");
        timer = setTimeout(() => void read(), 2000);
      }
    }
    void read();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [job.id, job.state]);
  const eta = etaSeconds(elapsedSeconds(job.started_at, job.finished_at), progress);
  return (
    <div className="space-y-2">
      {progress != null && (
        <>
          <p className="text-xs tabular-nums text-muted-foreground">
            Solver iterations · {progress.toFixed(1)}%
            {eta != null && ` · about ${Math.ceil(eta / 60)} min left`}
          </p>
          <Progress value={progress} aria-label="Solver iteration progress" />
        </>
      )}
      <Residuals log={text} />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <textarea
        readOnly
        aria-label="Job log tail"
        className="h-64 w-full resize-y overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-3 font-mono text-[11px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-brand"
        value={stage || text || "No output yet. Queued jobs need the separate local worker."}
      />
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const cache = useQueryClient();
  const cancel = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      setConfirm(false);
      void cache.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  const elapsed = elapsedSeconds(job.started_at, job.finished_at);
  return (
    <article className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">
            {typeof job.params.run === "string" ? job.params.run : job.id}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.kind} {elapsed != null ? `· ${elapsed.toFixed(0)} s` : "· awaiting worker"}
          </p>
        </div>
        <span className="rounded-full border px-2 py-0.5 text-xs">{job.state}</span>
      </div>
      {job.error && <p className="text-xs text-destructive">{job.error}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          Log and progress
        </Button>
        {(job.state === "running" || job.state === "queued") && (
          <Dialog open={confirm} onOpenChange={setConfirm}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="xs">
                Cancel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this job?</DialogTitle>
                <DialogDescription>
                  The process group will receive SIGTERM, then SIGKILL after ten seconds if
                  necessary. Partial case files and logs are kept.
                </DialogDescription>
              </DialogHeader>
              {cancel.error && (
                <p role="alert" className="text-destructive">
                  {cancel.error.message}
                </p>
              )}
              <Button
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(job.id)}
              >
                {cancel.isPending ? "Stopping…" : "Confirm cancellation"}
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {expanded && <LogTail key={`${job.id}:${job.state}`} job={job} />}
    </article>
  );
}

/** Global job tray: a popover from the header, so the workspace stays in view. */
export function JobsDrawer() {
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: listJobs,
    refetchInterval: open ? 2000 : 15000,
  });
  const seen = useRef(new Set<string>());
  useEffect(() => {
    for (const job of jobs.data ?? []) {
      if (job.kind === "cfd_run" && job.state === "succeeded" && !seen.current.has(job.id)) {
        seen.current.add(job.id);
        void cache.invalidateQueries({ queryKey: ["cfd-runs"] });
      }
    }
  }, [jobs.data, cache]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <ListTodo />
        Jobs {jobs.data?.filter((j) => j.state === "queued" || j.state === "running").length || ""}
      </PopoverTrigger>
      <PopoverContent className="flex max-h-[min(70dvh,40rem)] flex-col overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Local jobs</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Durable queue · one CFD job at a time. Computational completion is separate from
            scientific acceptance.
          </p>
        </div>
        <div className="min-h-0 space-y-3 overflow-y-auto p-4">
          {jobs.isPending && <div className="h-24 animate-pulse rounded-lg bg-surface-2" />}
          {jobs.error && (
            <p role="alert" className="text-sm text-destructive">
              {jobs.error.message}
            </p>
          )}
          {jobs.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No jobs queued. Use New run to approve a local case.
            </p>
          )}
          {jobs.data?.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
