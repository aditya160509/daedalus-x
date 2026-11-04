"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, RotateCcw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import {
  Button,
  EmptyState,
  Metric,
  NumberField,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
  Skeleton,
} from "@/components/ui/primitives";
import { racingPoints, type RacingPointsRequest } from "@/lib/api";
import { fmt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

type FieldSource = "measured" | "estimated" | "synthetic";

const SOURCE_OPTIONS = [
  { value: "synthetic", label: "Synthetic" },
  { value: "estimated", label: "Estimated" },
  // Measured must remain unavailable until actual timing data is supplied.
] as const;

/** Deterministic samples keep the scenario stable between renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function draw(rand: () => number, mean: number, sd: number, n: number): number[] {
  return Array.from({ length: n }, () => Math.max(0.2, mean + sd * gaussian(rand)));
}

/** Consistent subhead plus a responsive field grid, one column in the narrow input rail. */
function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="label-caps">{title}</h3>
      {hint && <p className="-mt-1 text-2xs leading-4 text-muted-foreground">{hint}</p>}
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 xl:grid-cols-1">{children}</div>
    </section>
  );
}

function RoundChart({ probabilities }: { probabilities: number[] }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 66, right: 28, top: 8, bottom: 24 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: unknown) => (typeof v === "number" ? `${(v * 100).toFixed(0)}%` : "—"),
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 1,
        ...chartAxis(t),
        axisLabel: {
          color: t.muted,
          fontSize: 10,
          formatter: (v: number) => `${Math.round(v * 100)}%`,
        },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: probabilities.map((_, i) => `Round ${i + 1}`),
        ...chartAxis(t),
        splitLine: { show: false },
        axisLabel: { color: t.text2, fontSize: 11, fontFamily: "inherit" },
      },
      series: [
        {
          type: "bar",
          data: probabilities,
          barWidth: 13,
          itemStyle: { color: t.brand, borderRadius: [0, 3, 3, 0] },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.lineStrong, type: "dashed" },
            label: { show: false },
            data: [{ xAxis: 0.5 }],
          },
        },
      ],
    };
  }, [probabilities]);
  return (
    <div
      ref={host}
      className="h-56 w-full"
      role="img"
      aria-label={`Knock-out win probability by round: ${probabilities
        .map((probability, i) => `round ${i + 1} ${Math.round(probability * 100)}%`)
        .join(", ")}`}
    />
  );
}

export function PointsPanel({
  baselineTime,
  baselineSpread,
}: {
  baselineTime?: number | null;
  baselineSpread?: number | null;
}) {
  const [carTime, setCarTime] = useState(baselineTime ?? 1.18);
  const [carSpread, setCarSpread] = useState(baselineSpread ?? 0.01);
  const [reactionMean, setReactionMean] = useState(0.25);
  const [reactionSd, setReactionSd] = useState(0.03);
  const [fieldMean, setFieldMean] = useState(1.5);
  const [fieldSd, setFieldSd] = useState(0.06);
  const [roundBase, setRoundBase] = useState(1.58);
  const [roundSd, setRoundSd] = useState(0.02);
  const [dnf, setDnf] = useState(0);
  const [races, setRaces] = useState(2);
  const [source, setSource] = useState<FieldSource>("synthetic");
  const [compliant, setCompliant] = useState(true);

  const request = useMemo<RacingPointsRequest>(() => {
    const rand = mulberry32(7);
    return {
      car_time_s: draw(rand, carTime, carSpread, 400),
      reaction_mean_s: reactionMean,
      reaction_sd_s: reactionSd,
      other_best_total_s: draw(rand, fieldMean, fieldSd, 30),
      other_best_car_s: draw(rand, fieldMean - 0.25, fieldSd, 30),
      round_opponents_s: [0, 1, 2, 3].map((i) =>
        draw(rand, Math.max(0.25, roundBase - i * 0.03), roundSd, 240),
      ),
      field_source: source,
      reaction_races: races,
      dnf_probability: dnf,
      performance_compliant: compliant,
      seed: 0,
    };
  }, [
    carTime,
    carSpread,
    reactionMean,
    reactionSd,
    fieldMean,
    fieldSd,
    roundBase,
    roundSd,
    dnf,
    races,
    source,
    compliant,
  ]);

  const result = useQuery({
    queryKey: ["racing-points", request],
    queryFn: () => racingPoints(request),
    staleTime: 60_000,
  });
  const data = result.data;
  const total = Math.max(data?.expected_total_points ?? 0, 1);
  const parts = data
    ? [
        { label: "Reaction", value: data.reaction_points_mean, tone: "bg-brand" },
        { label: "Knock-out", value: data.knockout_points_mean, tone: "bg-prov-predicted" },
        { label: "Fastest car", value: data.expected_bonus_points, tone: "bg-ok" },
      ]
    : [];

  return (
    <Panel
      title="Racing points"
      description="Expected India NF points from a scenario. The field is an assumption until real results exist."
      actions={
        <>
          {result.isFetching && <span className="text-2xs text-muted-foreground">updating…</span>}
          {baselineTime != null && (
            <Button
              onClick={() => {
                setCarTime(baselineTime);
                if (baselineSpread != null) setCarSpread(baselineSpread);
              }}
              title="Use the current race simulation as the car time"
            >
              <RotateCcw className="size-3" aria-hidden />
              Use simulation
            </Button>
          )}
          {data && <ProvenanceBadge value={data.field_source} />}
        </>
      }
      bodyClassName="p-4"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="space-y-2">
            <h3 className="label-caps">Scenario basis</h3>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Field source"
                value={source}
                onChange={setSource}
                options={SOURCE_OPTIONS}
              />
            </div>
            <p className="text-2xs leading-4 text-muted-foreground">
              Field times are generated from the assumptions above. Measured provenance requires an
              actual timing-data import.
            </p>
          </section>

          <FieldGroup title="Car" hint="Race time for the car, without reaction.">
            <NumberField
              id="points-car-time"
              label="Car time (mean)"
              unit="s"
              value={carTime}
              onChange={setCarTime}
              min={0.5}
              max={5}
              step={0.001}
            />
            <NumberField
              id="points-car-spread"
              label="Car time spread"
              unit="s"
              value={carSpread}
              onChange={setCarSpread}
              min={0}
              max={0.5}
              step={0.001}
            />
          </FieldGroup>

          <FieldGroup title="Reaction" hint="The best counted race sets the reaction time.">
            <NumberField
              id="points-reaction"
              label="Reaction time (mean)"
              unit="s"
              value={reactionMean}
              onChange={setReactionMean}
              min={0}
              max={2}
              step={0.01}
            />
            <NumberField
              id="points-reaction-sd"
              label="Reaction spread"
              unit="s"
              value={reactionSd}
              onChange={setReactionSd}
              min={0}
              max={1}
              step={0.01}
            />
            <NumberField
              id="points-races"
              label="Reaction races counted"
              unit="runs"
              value={races}
              onChange={(value) => setRaces(Math.round(value))}
              min={1}
              max={4}
              step={1}
            />
          </FieldGroup>

          <FieldGroup
            title="Field"
            hint="Total race times (car plus reaction) for the other teams."
          >
            <NumberField
              id="points-field"
              label="Field best total (mean)"
              unit="s"
              value={fieldMean}
              onChange={setFieldMean}
              min={0.5}
              max={5}
              step={0.01}
            />
            <NumberField
              id="points-field-sd"
              label="Field spread"
              unit="s"
              value={fieldSd}
              onChange={setFieldSd}
              min={0}
              max={0.5}
              step={0.01}
            />
            <NumberField
              id="points-round"
              label="Round 1 opponent (mean)"
              unit="s"
              value={roundBase}
              onChange={setRoundBase}
              min={0.5}
              max={5}
              step={0.01}
            />
            <NumberField
              id="points-round-sd"
              label="Opponent spread"
              unit="s"
              value={roundSd}
              onChange={setRoundSd}
              min={0}
              max={0.5}
              step={0.01}
            />
          </FieldGroup>

          <FieldGroup title="Reliability">
            <NumberField
              id="points-dnf"
              label="DNF probability"
              unit="—"
              value={dnf}
              onChange={setDnf}
              min={0}
              max={0.5}
              step={0.01}
            />
          </FieldGroup>

          <label className="flex items-start gap-2 border-t pt-3 text-xs leading-5 text-text-2">
            <input
              type="checkbox"
              checked={compliant}
              onChange={(event) => setCompliant(event.target.checked)}
              className="mt-0.5 size-3.5 shrink-0 accent-[var(--brand)]"
            />
            Eligible for the fastest-car bonus
          </label>
        </div>

        <div className="flex min-w-0 flex-col gap-5" aria-busy={result.isFetching}>
          {result.isError ? (
            <EmptyState icon={<BarChart3 className="size-5" />} title="Points model unavailable">
              {result.error.message}
            </EmptyState>
          ) : !data ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-56" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric
                  label="Expected points"
                  value={fmt(data.expected_total_points, 0)}
                  unit="pts"
                  provenance={data.field_source}
                />
                <Metric
                  label="Reaction racing"
                  value={fmt(data.reaction_points_mean, 0)}
                  unit="pts"
                  hint={`p05–p95 ${fmt(data.reaction_points_p05, 0)}–${fmt(data.reaction_points_p95, 0)}`}
                />
                <Metric label="Knock-out" value={fmt(data.knockout_points_mean, 0)} unit="pts" />
                <Metric
                  label="Fastest car chance"
                  value={fmtPct(data.fastest_car_probability, 0)}
                  unit="%"
                  hint={`Bonus ${fmt(data.expected_bonus_points, 1)} pts`}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="mb-2 text-[11px] font-medium text-muted-foreground">
                      Where the points come from
                    </h3>
                    <div
                      className="flex h-5 w-full overflow-hidden rounded-sm border border-border"
                      role="img"
                      aria-label={parts
                        .map((part) => `${part.label} ${fmt(part.value, 0)} points`)
                        .join(", ")}
                    >
                      {parts.map((part) => (
                        <div
                          key={part.label}
                          className={part.tone}
                          style={{ width: `${Math.max(0, part.value / total) * 100}%` }}
                        />
                      ))}
                    </div>
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      {parts.map((part) => (
                        <li key={part.label} className="flex items-center gap-1.5">
                          <span
                            className={cn("inline-block size-2 rounded-sm", part.tone)}
                            aria-hidden
                          />
                          {part.label}
                          <span className="tabular ml-auto font-mono text-foreground">
                            {fmt(part.value, 1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-2xs leading-4 text-muted-foreground">
                    Scenario output, not a field prediction. The model samples a normal distribution
                    around each mean; change the source to measured only when the times are real.
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <h3 className="mb-1 text-[11px] font-medium text-muted-foreground">
                    Knock-out path · chance to win each round
                  </h3>
                  <RoundChart probabilities={data.round_win_probabilities} />
                </div>
              </div>

              <details className="text-[11px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Model assumptions ({data.assumptions.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {data.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
