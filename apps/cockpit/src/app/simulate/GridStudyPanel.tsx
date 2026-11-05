"use client";

import { ConditionSweep } from "./ConditionSweep";
import { Table } from "@/components/ui/table";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Panel, ProvenanceBadge, SegmentedControl } from "@/components/ui/primitives";
import { type GridStudy, listStudies } from "@/lib/api";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { cn } from "@/lib/utils";

function StudyChart({
  study,
  speed = false,
  area = false,
}: {
  study: GridStudy;
  speed?: boolean;
  area?: boolean;
}) {
  const rows = study.cases.filter((r) =>
    speed ? r.label === "grid_medium" || r.label.startsWith("speed_") : r.label.startsWith("grid_"),
  );
  const host = useECharts(() => {
    const t = chartTheme();
    const points = rows.filter(
      (r) => r.cd != null && (speed || r.cells != null) && (!area || r.reference_area_m2 != null),
    );
    const x = (r: GridStudy["cases"][number]) => (speed ? r.speed_m_s : r.cells);
    const scale = (r: GridStudy["cases"][number]) =>
      area ? (r.reference_area_m2 ?? 0) * 10000 : 1;
    const fine = points.find((r) => r.label === "grid_fine");
    const commonArea = fine?.reference_area_m2;
    const accepted =
      commonArea != null &&
      points.filter(
        (r) =>
          r.label.startsWith("grid_") &&
          r.acceptance === "accepted" &&
          r.reference_area_m2 === commonArea,
      ).length === 3;
    const gci = study.gci?.status === "monotonic" ? study.gci.gci_fine_pct : null;
    const fineValue = fine?.cd != null ? fine.cd * scale(fine) : null;
    const uncertainty =
      !speed && accepted && gci != null && fineValue != null
        ? (Math.abs(fineValue) * gci) / 100
        : null;
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 50, right: 20, top: 24, bottom: 40 },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: speed ? "value" : "log",
        name: speed ? "speed (m/s)" : "cells (log)",
        nameLocation: "middle",
        nameGap: 26,
        axisLabel: { color: t.muted },
      },
      yAxis: {
        ...chartAxis(t),
        type: "value",
        scale: true,
        name: area ? "CdA (cm²)" : "Cd (1)",
        axisLabel: { color: t.muted },
      },
      series: [
        {
          type: "line",
          data: points.map((r) => [x(r), r.cd! * scale(r)]),
          itemStyle: { color: t.brand },
          markLine:
            !speed && accepted && fine && study.gci?.extrapolated_cd != null
              ? {
                  symbol: "none",
                  lineStyle: { type: "dashed", color: t.muted },
                  data: [{ yAxis: study.gci.extrapolated_cd * scale(fine), name: "Extrapolated" }],
                }
              : undefined,
        },
        ...(fine && fineValue != null && uncertainty != null
          ? [
              {
                name: "Fine-grid GCI",
                type: "line",
                symbol: "rect",
                symbolSize: [14, 2],
                itemStyle: { color: t.risk },
                lineStyle: { color: t.risk, type: "dashed" },
                data: [
                  [x(fine), fineValue - uncertainty],
                  [x(fine), fineValue + uncertainty],
                ],
              },
            ]
          : []),
        ...points
          .filter((r) => r.ci95 != null)
          .map((r) => ({
            type: "line",
            silent: true,
            symbol: "rect",
            symbolSize: [8, 2],
            lineStyle: { color: t.brand },
            data: [
              [x(r), r.ci95![0] * scale(r)],
              [x(r), r.ci95![1] * scale(r)],
            ],
          })),
      ],
    };
  }, [study, speed, area]);
  const hasData = rows.some((r) => r.cd != null && (!area || r.reference_area_m2 != null));
  return (
    <div className="relative h-56 w-full">
      <div
        ref={host}
        role="img"
        aria-label={
          speed
            ? `${area ? "CdA" : "Cd"} versus speed with numerical mean confidence intervals`
            : `${area ? "CdA" : "Cd"} versus mesh cells with numerical mean confidence intervals`
        }
        className="h-full w-full"
      />
      {!hasData && (
        <p className="absolute inset-0 flex items-center justify-center bg-card text-sm text-muted-foreground">
          {area
            ? "Waiting for solver results with a recorded reference area."
            : "Waiting for solver results. No values are inferred."}
        </p>
      )}
    </div>
  );
}

export function GridStudyPanel() {
  const [selected, setSelected] = useState("");
  const [coefficient, setCoefficient] = useState<"cd" | "cda">("cd");
  const studies = useQuery({ queryKey: ["studies"], queryFn: listStudies, refetchInterval: 15000 });
  const study = studies.data?.find((s) => s.study_id === selected) ?? studies.data?.[0];
  const gci = study?.gci?.gci_fine_pct;
  return (
    <Panel
      title="Grid study and speed sensitivity"
      className="lg:col-span-12"
      actions={<ProvenanceBadge value="simulated" />}
      bodyClassName="p-4"
    >
      {studies.error && (
        <p role="alert" className="text-sm text-danger">
          {studies.error.message}
        </p>
      )}
      {studies.isPending ? (
        <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
      ) : !study ? (
        <p className="text-sm text-muted-foreground">
          Create a study with <code>daedalus grid submit --design DESIGN --prefix STUDY</code>. Five
          queued cases share the medium 20 m/s result. Run the worker only when the machine is free.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="study-select" className="text-sm">
              Study
            </label>
            <select
              id="study-select"
              value={study.study_id}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-md border bg-background p-2 text-xs"
            >
              {studies.data?.map((s) => (
                <option value={s.study_id} key={s.study_id}>
                  {s.study_id}
                </option>
              ))}
            </select>
            <span
              className={cn(
                "ml-auto rounded-full border px-2 py-1 text-xs",
                gci != null
                  ? gci <= 3
                    ? "text-ok"
                    : gci <= 5
                      ? "text-risk"
                      : "text-danger"
                  : "text-muted-foreground",
              )}
            >
              {gci != null ? `GCI fine ${gci.toFixed(3)}%` : "GCI unavailable"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {study.gci?.reason ??
              "All three grid cases must pass numerical quality gates before extrapolation."}{" "}
            {study.note}
          </p>
          <SegmentedControl
            label="Drag measure"
            options={[
              { value: "cd", label: "Cd (1)" },
              { value: "cda", label: "CdA (cm²)" },
            ]}
            value={coefficient}
            onChange={setCoefficient}
          />
          <p className="text-xs text-muted-foreground">
            Solid bars show solver-window 95% confidence intervals. The dashed fine-grid bar is
            discretisation GCI and appears only for three accepted refinements with a common
            reference area.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <StudyChart study={study} area={coefficient === "cda"} />
            <StudyChart study={study} speed area={coefficient === "cda"} />
          </div>
          <div className="overflow-x-auto">
            <Table aria-label="Grid-study cases" className="w-full text-xs">
              <caption className="sr-only">Study run status and numerical Cd intervals</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2">
                    Case
                  </th>
                  <th>Quality</th>
                  <th scope="col" className="text-right">
                    Cells
                  </th>
                  <th scope="col" className="text-right">
                    Cd mean [95% CI]
                  </th>
                </tr>
              </thead>
              <tbody>
                {study.cases.map((r) => (
                  <tr key={r.run_id} className="border-b">
                    <td className="py-2 font-mono">{r.run_id}</td>
                    <td
                      className={
                        r.acceptance === "rejected" ? "text-danger" : "text-muted-foreground"
                      }
                    >
                      {r.acceptance ?? "not assessed"}
                    </td>
                    <td className="text-right tabular-nums">{r.cells?.toLocaleString() ?? "—"}</td>
                    <td className="text-right font-mono tabular-nums">
                      {r.cd?.toPrecision(5) ?? "—"}{" "}
                      {r.ci95 ? `[${r.ci95.map((v) => v.toPrecision(4)).join(", ")}]` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {study.speed_check && (
            <p className="text-xs text-muted-foreground">
              Slope dCd/dlog(Re): {study.speed_check.slope.toPrecision(4)} [
              {study.speed_check.slope_ci95.map((v) => v.toPrecision(3)).join(", ")}].{" "}
              {study.speed_check.interpretation}
            </p>
          )}
        </div>
      )}
      <ConditionSweep />
    </Panel>
  );
}
