"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";
import {
  getCandidateScore,
  listCandidateForecasts,
  listCfdRuns,
  listOracleAcquisitions,
  recordOracleAcquisition,
} from "@/lib/api";

type Entry = Awaited<ReturnType<typeof listOracleAcquisitions>>[number];
type Score = Awaited<ReturnType<typeof getCandidateScore>>;

function AcquisitionChart({ rows }: { rows: Entry[] }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 65, right: 24, top: 35, bottom: 44 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toPrecision(3)} cm²`,
      },
      xAxis: {
        ...chartAxis(t),
        type: "category",
        data: rows.map((_, i) => i + 1),
        name: "Recorded decision",
        nameLocation: "middle",
        nameGap: 26,
      },
      yAxis: { ...chartAxis(t), type: "value", name: "Expected improvement (cm²)" },
      series: [
        {
          type: "line",
          data: rows.map((row) => ({
            value: row.ei_m2 * 10000,
            itemStyle: { color: row.action === "veto" ? t.risk : t.brand },
          })),
          lineStyle: { color: t.brand },
        },
      ],
    };
  }, [rows]);
  return (
    <div
      ref={host}
      className="h-52 w-full"
      role="img"
      aria-label="Expected improvement at each recorded acquisition decision"
    />
  );
}

function ScoreChart({ data }: { data: Score }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const mean = data.predicted_cda_m2 * 10000;
    const sd = data.sd_m2 * 10000;
    const actual = data.actual_cda_m2 * 10000;
    return {
      animation: false,
      grid: { left: 63, right: 25, top: 35, bottom: 42 },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "CdA (cm²)",
        nameLocation: "middle",
        nameGap: 26,
        scale: true,
      },
      yAxis: { ...chartAxis(t), type: "category", data: ["Accepted CFD", "GP forecast"] },
      series: [
        {
          name: "Forecast ±1 SD",
          type: "line",
          symbol: "rect",
          symbolSize: [3, 10],
          data: [
            [mean - sd, 1],
            [mean + sd, 1],
          ],
          itemStyle: { color: t.muted },
          lineStyle: { color: t.muted, type: "dashed" },
        },
        {
          name: "CdA",
          type: "line",
          lineStyle: { opacity: 0 },
          symbol: "circle",
          symbolSize: 9,
          data: [
            [actual, 0],
            [mean, 1],
          ],
          itemStyle: { color: t.brand },
        },
      ],
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-40 w-full"
      role="img"
      aria-label="Frozen ORACLE drag area forecast compared to accepted CFD"
    />
  );
}

export function CampaignAnalysis({ unit }: { unit: number[] }) {
  const cache = useQueryClient();
  const history = useQuery({ queryKey: ["oracle-acquisition"], queryFn: listOracleAcquisitions });
  const candidates = useQuery({
    queryKey: ["oracle-candidate-forecasts"],
    queryFn: listCandidateForecasts,
  });
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns });
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<Entry["action"]>("proceed");
  const [edited, setEdited] = useState("");
  const [design, setDesign] = useState("");
  const [run, setRun] = useState("");
  const decision = useMutation({
    mutationFn: recordOracleAcquisition,
    onSuccess: () => {
      setReason("");
      void cache.invalidateQueries({ queryKey: ["oracle-acquisition"] });
    },
  });
  const score = useQuery({
    queryKey: ["oracle-candidate-score", design, run],
    queryFn: () => getCandidateScore(design, run),
    enabled: Boolean(design && run),
    retry: false,
  });
  const edits = edited.split(",").map((v) => (v.trim() ? Number(v) : NaN));
  const editReady =
    edits.length === unit.length && edits.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  const error = history.error ?? candidates.error ?? runs.error;
  const currentScore = score.data;
  return (
    <Panel
      title="Campaign acquisition and accepted-run scoring"
      description="Records the current candidate and engineer decision. Building CAD and queueing CFD are separate actions."
      bodyClassName="space-y-4 overflow-y-auto p-4"
    >
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          decision.mutate({
            action,
            unit,
            reason,
            edited_unit: action === "edit" ? edits : undefined,
          });
        }}
      >
        <label className="grid gap-1 text-xs">
          Decision
          <select
            className="h-8 max-w-xs rounded border bg-background px-2"
            value={action}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "proceed" || value === "edit" || value === "veto") setAction(value);
            }}
          >
            <option value="proceed">Proceed</option>
            <option value="edit">Edit</option>
            <option value="veto">Veto</option>
          </select>
        </label>
        {action === "edit" && (
          <label htmlFor="oracle-edit-unit" className="grid gap-1 text-xs">
            Revised normalized coordinates (comma-separated)
            <Input
              id="oracle-edit-unit"
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              placeholder={unit.map((v) => v.toFixed(4)).join(", ")}
            />
          </label>
        )}
        <label htmlFor="oracle-decision-reason" className="grid gap-1 text-xs">
          Reason
          <Input
            id="oracle-decision-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={400}
          />
        </label>
        <Button
          size="sm"
          type="submit"
          disabled={
            unit.length === 0 ||
            reason.trim().length < 3 ||
            (action === "edit" && !editReady) ||
            decision.isPending
          }
        >
          Record decision
        </Button>
        {decision.error && (
          <p role="alert" className="text-xs text-destructive">
            {decision.error.message}
          </p>
        )}
      </form>
      {history.data?.length ? (
        <>
          <AcquisitionChart rows={history.data} />
          <ul className="space-y-2 text-xs">
            {history.data.toReversed().map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2 border-b pb-2">
                <span className="font-medium capitalize">{row.action}</span>
                <ProvenanceBadge value={row.provenance} />
                <span>{row.reason}</span>
                {row.edited_unit && (
                  <span className="font-mono">
                    {row.edited_unit.map((v) => v.toFixed(3)).join(", ")}
                  </span>
                )}
                <time dateTime={row.created_at} className="ml-auto text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {history.isPending
            ? "Loading acquisition history…"
            : "No acquisition decisions recorded."}
        </p>
      )}
      <section className="space-y-2 border-t pt-3">
        <h3 className="text-sm font-medium">Prospective CdA score</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            Built ORACLE candidate
            <select
              className="h-8 rounded border bg-background px-2"
              value={design}
              onChange={(e) => setDesign(e.target.value)}
            >
              <option value="">Select candidate…</option>
              {candidates.data?.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Accepted CFD run
            <select
              className="h-8 rounded border bg-background px-2"
              value={run}
              onChange={(e) => setRun(e.target.value)}
            >
              <option value="">Select run…</option>
              {runs.data
                ?.filter((r) => r.acceptance === "accepted" && r.state === "succeeded")
                .map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.run_id}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {candidates.data?.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Build an ORACLE candidate to capture a forecast before running CFD.
          </p>
        )}
        {design && run && score.isPending && (
          <p className="text-xs text-muted-foreground">Matching run to candidate geometry…</p>
        )}
        {score.error && (
          <p role="alert" className="text-xs text-destructive">
            {score.error.message}
          </p>
        )}
        {currentScore && (
          <>
            <div className="flex gap-2">
              <ProvenanceBadge value={currentScore.provenance} />
              <ProvenanceBadge value="simulated" />
            </div>
            <ScoreChart data={currentScore} />
            <p className="text-xs text-muted-foreground">
              CFD at {currentScore.speed_m_s} m/s. Error, CFD minus forecast:{" "}
              {((currentScore.actual_cda_m2 - currentScore.predicted_cda_m2) * 10000).toFixed(3)}{" "}
              cm². The forecast interval shows one GP standard deviation.
            </p>
          </>
        )}
      </section>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </Panel>
  );
}
