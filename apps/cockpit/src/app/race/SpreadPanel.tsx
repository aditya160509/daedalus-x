"use client";

import type { MonteCarlo, UncertaintyInput } from "@/lib/api";
import { SpreadChart } from "@/components/charts/SpreadChart";
import { chartTheme, useECharts } from "@/components/charts/useECharts";
import { NumberField, Panel, ProvenanceBadge } from "@/components/ui/primitives";

const LABELS: Record<keyof UncertaintyInput, string> = {
  thrust: "Thrust",
  cda: "CdA",
  mass: "Mass",
  crr: "Rolling",
};

const UNCERTAINTY_KEYS = ["thrust", "cda", "mass", "crr"] as const satisfies ReadonlyArray<
  keyof UncertaintyInput
>;
const isUncertaintyKey = (k: string): k is keyof UncertaintyInput =>
  (UNCERTAINTY_KEYS as ReadonlyArray<string>).includes(k);

/**
 * Race-time spread from input uncertainty (Monte Carlo). The query lives in the workspace so
 * the same samples also drive the p5–p95 velocity fan on the telemetry wall.
 */
export function SpreadPanel({
  data,
  error,
  fetching,
  uncertainty,
  onUncertainty,
}: {
  data?: MonteCarlo;
  error: Error | null;
  fetching: boolean;
  uncertainty: UncertaintyInput;
  onUncertainty: (u: UncertaintyInput) => void;
}) {
  const p = data?.percentiles_s ?? {};
  const ranked = Object.entries(data?.sensitivity ?? {}).toSorted(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );

  return (
    <Panel
      title="Race-time spread"
      description={`${data?.n ?? 1000} seeded samples from the 1σ inputs below.`}
      actions={
        <>
          {fetching && <span className="text-2xs text-muted-foreground">sampling…</span>}
          <ProvenanceBadge value="predicted" />
        </>
      }
      bodyClassName="p-3"
      className="min-h-0"
    >
      {!data && !error ? (
        <div className="flex h-full flex-col gap-2">
          <div className="grid h-8 grid-cols-4 gap-2">
            {["p5", "median", "p95", "finish"].map((k) => (
              <div key={k} className="animate-pulse rounded-md bg-surface-2" />
            ))}
          </div>
          <div className="min-h-24 flex-1 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
        </div>
      ) : error ? (
        <p role="alert" className="text-xs text-danger">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <dl className="grid grid-cols-4 gap-2 text-sm">
            {(
              [
                ["p5", p.p5],
                ["median", p.p50],
                ["p95", p.p95],
                ["finish", data ? data.finish_fraction * 100 : undefined],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="tabular font-medium">
                  {v == null ? "—" : k === "finish" ? `${v.toFixed(1)}%` : `${v.toFixed(3)} s`}
                </dd>
              </div>
            ))}
          </dl>
          <div className="h-36">
            {data && data.histogram.counts.length > 0 ? (
              <SpreadChart
                edges={data.histogram.edges_s}
                counts={data.histogram.counts}
                percentiles={data.percentiles_s}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No finishing samples — every car stopped before the line.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {UNCERTAINTY_KEYS.map((k) => (
              <NumberField
                key={k}
                id={`mc-${k}`}
                label={`${LABELS[k]} 1σ`}
                unit="%"
                value={+(uncertainty[k] * 100).toFixed(2)}
                min={0}
                max={49}
                step={0.5}
                onChange={(v) => onUncertainty({ ...uncertainty, [k]: v / 100 })}
              />
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">What drives the spread</p>
            <Tornado ranked={ranked} />
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Tornado chart: rank-correlation of each input with race time, sorted by strength. */
function Tornado({ ranked }: { ranked: Array<[string, number]> }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const rows = [...ranked].reverse();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 64, right: 40, top: 4, bottom: 4 },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.popover,
        borderColor: t.lineStrong,
        textStyle: { color: t.text, fontSize: 11 },
      },
      xAxis: { type: "value", min: -1, max: 1, show: false },
      yAxis: {
        type: "category",
        data: rows.map(([k]) => (isUncertaintyKey(k) ? LABELS[k] : k)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.text2, fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          barWidth: 8,
          data: rows.map(([, rho]) => ({
            value: rho,
            itemStyle: { color: rho < 0 ? "#3ccf91" : "#f5a524", borderRadius: 2 },
          })),
          label: {
            show: true,
            position: "right",
            color: t.muted,
            fontSize: 10,
            formatter: (p: { value: number }) => p.value.toFixed(2),
          },
        },
      ],
    };
  }, [ranked]);
  return (
    <div
      ref={host}
      className="h-32 w-full"
      role="img"
      aria-label="Input sensitivity, tornado chart"
    />
  );
}
