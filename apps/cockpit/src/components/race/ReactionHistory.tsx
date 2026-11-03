"use client";

import { ToolboxComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { reactionStats, RETAINED_ATTEMPTS, type ReactionAttempt } from "@/lib/reactionHistory";

echarts.use([ToolboxComponent]);
const display = (v: number | null) => (v === null ? "—" : v.toFixed(1));

export function ReactionHistory({ attempts }: { attempts: ReactionAttempt[] }) {
  const stats = reactionStats(attempts);
  const recent = attempts.slice(-50);
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 45, right: 18, top: 30, bottom: 30 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: unknown) => (v == null ? "False start" : `${Number(v).toFixed(0)} ms`),
      },
      toolbox: { feature: { saveAsImage: { type: "png", name: "browser-reaction-practice" } } },
      xAxis: {
        type: "category",
        ...chartAxis(t),
        data: recent.map(
          (a, i) =>
            `${attempts.length - recent.length + i + 1}${a.outcome === "false_start" ? " ×" : ""}`,
        ),
        name: "attempt",
      },
      yAxis: { type: "value", ...chartAxis(t), name: "browser latency (ms)", min: 0 },
      series: [
        {
          type: "line",
          name: "Reaction",
          connectNulls: false,
          symbolSize: 5,
          lineStyle: { color: t.brand, width: 1 },
          itemStyle: { color: t.brand },
          data: recent.map((a) => a.ms),
        },
      ],
    };
  }, [attempts]);
  const exportHistory = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              provenance: "browser_practice",
              retained_limit: RETAINED_ATTEMPTS,
              attempts,
              statistics: stats,
              caveat:
                "Display/input latency included; not track timing or independently validated measurement.",
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reaction-practice.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="mt-4 space-y-3 border-t pt-3" aria-label="Reaction practice statistics">
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Median</dt>
          <dd className="font-mono">{display(stats.median)} ms</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sample SD</dt>
          <dd className="font-mono">{display(stats.sd)} ms</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">p10–p90</dt>
          <dd className="font-mono">
            {display(stats.p10)}–{display(stats.p90)} ms
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">False starts (recorded)</dt>
          <dd className="font-mono">
            {stats.falseStarts} / {stats.recordedAttempts} attempts
          </dd>
        </div>
      </dl>
      <div
        ref={host}
        className="h-48 w-full"
        role="img"
        aria-label="Last 50 practice attempts; crosses and gaps mark false starts"
      />
      {!attempts.length && (
        <p className="text-xs text-muted-foreground">
          Complete a practice start to populate the statistics.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {stats.count} completed reactions in the last {RETAINED_ATTEMPTS} retained attempts. Chart
        shows the latest 50; × means false start.{" "}
        {stats.legacy > 0 &&
          `${stats.legacy} legacy entries have no timestamp or false-start history and are excluded from the false-start denominator.`}{" "}
        Browser scheduling, display and input latency are included. These are practice results, not
        measured race-day reactions.
      </p>
      <Button size="sm" variant="outline" disabled={!attempts.length} onClick={exportHistory}>
        Export practice JSON
      </Button>
    </section>
  );
}
