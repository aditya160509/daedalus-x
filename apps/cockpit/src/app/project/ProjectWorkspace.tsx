"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  EmptyState,
  Metric,
  NumberField,
  Panel,
  ProvenanceBadge,
  Skeleton,
} from "@/components/ui/primitives";
import {
  forecastProject,
  getProjectPlan,
  listProjectForecasts,
  saveProjectPlan,
  type PlanAssumption,
  type PlanTask,
  type ProjectPlan,
  type ScoreItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

/** Clearly labelled starting point; nothing is saved until the team presses Save. */
const EXAMPLE: PlanTask[] = [
  {
    id: "cad",
    name: "Final CAD",
    days: { optimistic: 5, likely: 7, pessimistic: 12 },
    depends_on: [],
    cost: null,
    owner: "",
    source: "",
  },
  {
    id: "cfd",
    name: "CFD runs",
    days: { optimistic: 3, likely: 5, pessimistic: 9 },
    depends_on: ["cad"],
    cost: null,
    owner: "",
    source: "",
  },
  {
    id: "cnc",
    name: "CNC both cars",
    days: { optimistic: 2, likely: 3, pessimistic: 6 },
    depends_on: ["cfd"],
    cost: null,
    owner: "",
    source: "",
  },
  {
    id: "drawings",
    name: "Engineering drawings",
    days: { optimistic: 2, likely: 3, pessimistic: 5 },
    depends_on: ["cad"],
    cost: null,
    owner: "",
    source: "",
  },
  {
    id: "portfolio",
    name: "Portfolios",
    days: { optimistic: 6, likely: 8, pessimistic: 14 },
    depends_on: ["cfd"],
    cost: null,
    owner: "",
    source: "",
  },
];

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}`);
const inputClass =
  "w-full rounded border border-input bg-background px-1.5 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

interface Gap {
  kind: "task" | "assumption" | "score";
  id: string;
  text: string;
}

/** Honest coverage: what the plan claims but cannot point at a source for. */
function missingEvidence(plan: ProjectPlan): Gap[] {
  const gaps: Gap[] = [];
  for (const task of plan.tasks) {
    if (!task.source.trim()) {
      gaps.push({ kind: "task", id: task.id, text: `${task.name} has no estimate source` });
    }
  }
  for (const assumption of plan.assumptions) {
    if (!assumption.source.trim()) {
      gaps.push({
        kind: "assumption",
        id: assumption.id,
        text: `"${assumption.text}" has no source`,
      });
    }
  }
  for (const item of plan.scorecard) {
    if (!item.evidence.trim()) {
      gaps.push({
        kind: "score",
        id: item.id,
        text: `${item.criterion} has no evidence reference`,
      });
    } else if (item.status !== "complete") {
      gaps.push({
        kind: "score",
        id: item.id,
        text: `${item.criterion} is ${item.status}, not complete`,
      });
    }
  }
  return gaps;
}

export function ProjectWorkspace() {
  const saved = useQuery({ queryKey: ["project-plan"], queryFn: getProjectPlan });
  if (saved.error) {
    return (
      <EmptyState icon={<CalendarClock className="size-5" />} title="Plan unavailable">
        {saved.error.message}
      </EmptyState>
    );
  }
  if (!saved.data) return <Skeleton className="m-4 h-60" />;
  const empty = saved.data.tasks.length === 0;
  return (
    <PlanEditor
      initial={
        empty
          ? {
              tasks: EXAMPLE,
              deadline_days: 30,
              budget: null,
              currency: "INR",
              start_date: null,
              assumptions: [],
              scorecard: [],
            }
          : saved.data
      }
      example={empty}
    />
  );
}

function PlanEditor({ initial, example }: { initial: ProjectPlan; example: boolean }) {
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<ProjectPlan>(initial);
  const [isExample, setIsExample] = useState(example);
  const [rowKeys, setRowKeys] = useState(() => initial.tasks.map((t, i) => `${t.id}-${i}`));
  const [nextKey, setNextKey] = useState(initial.tasks.length);
  const [assumptionKeys, setAssumptionKeys] = useState(() =>
    initial.assumptions.map((a, i) => `${a.id}-${i}`),
  );
  const [scoreKeys, setScoreKeys] = useState(() =>
    initial.scorecard.map((s, i) => `${s.id}-${i}`),
  );
  const save = useMutation({ mutationFn: saveProjectPlan, onSuccess: () => setIsExample(false) });
  const forecast = useMutation({
    mutationFn: forecastProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-forecasts"] });
      void queryClient.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
  const forecasts = useQuery({
    queryKey: ["project-forecasts"],
    queryFn: listProjectForecasts,
  });

  const update = (i: number, patch: Partial<PlanTask>) =>
    setPlan({ ...plan, tasks: plan.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setDays = (i: number, key: keyof PlanTask["days"], value: number) =>
    update(i, { days: { ...plan.tasks[i].days, [key]: value } });
  const addTask = () => {
    setRowKeys([...rowKeys, `new-${nextKey}`]);
    setNextKey(nextKey + 1);
    setPlan({
      ...plan,
      tasks: [
        ...plan.tasks,
        {
          id: `task${plan.tasks.length + 1}`,
          name: "New task",
          days: { optimistic: 1, likely: 2, pessimistic: 4 },
          depends_on: [],
          cost: null,
          owner: "",
          source: "",
        },
      ],
    });
  };
  const removeTask = (i: number) => {
    setRowKeys(rowKeys.filter((_, j) => j !== i));
    setPlan({ ...plan, tasks: plan.tasks.filter((_, j) => j !== i) });
  };
  const updateAssumption = (i: number, patch: Partial<PlanAssumption>) =>
    setPlan({
      ...plan,
      assumptions: plan.assumptions.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    });
  const addAssumption = () => {
    setAssumptionKeys([...assumptionKeys, `new-${assumptionKeys.length}`]);
    setPlan({
      ...plan,
      assumptions: [
        ...plan.assumptions,
        {
          id: `a${plan.assumptions.length + 1}`,
          text: "New assumption",
          value: null,
          unit: "",
          source: "",
          provenance: "assumed",
        },
      ],
    });
  };
  const removeAssumption = (i: number) => {
    setAssumptionKeys(assumptionKeys.filter((_, j) => j !== i));
    setPlan({ ...plan, assumptions: plan.assumptions.filter((_, j) => j !== i) });
  };
  const updateScore = (i: number, patch: Partial<ScoreItem>) =>
    setPlan({
      ...plan,
      scorecard: plan.scorecard.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });
  const addScore = () => {
    setScoreKeys([...scoreKeys, `new-${scoreKeys.length}`]);
    setPlan({
      ...plan,
      scorecard: [
        ...plan.scorecard,
        {
          id: `pm${plan.scorecard.length + 1}`,
          criterion: "New criterion",
          points: null,
          claim: "",
          evidence: "",
          status: "missing",
        },
      ],
    });
  };
  const removeScore = (i: number) => {
    setScoreKeys(scoreKeys.filter((_, j) => j !== i));
    setPlan({ ...plan, scorecard: plan.scorecard.filter((_, j) => j !== i) });
  };

  const rows = plan.tasks.map((t, i) => ({ t, i, key: rowKeys[i] ?? t.id }));
  const f = forecast.data;
  const gaps = missingEvidence(plan);
  const declared = plan.scorecard.reduce((sum, item) => sum + (item.points ?? 0), 0);
  const complete = plan.scorecard
    .filter((item) => item.status === "complete" && item.evidence.trim())
    .reduce((sum, item) => sum + (item.points ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 overflow-y-auto p-3">
      <Panel
        title="Plan"
        description="Three-point estimates in days: best case, most likely, worst case. Depends on: task ids, comma separated. Source: where the estimate came from."
        actions={
          <>
            {isExample && (
              <ProvenanceBadge value="synthetic" title="Example plan: replace it with yours" />
            )}
            <Button onClick={addTask}>Add task</Button>
            <Button onClick={() => save.mutate(plan)} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="primary"
              onClick={() => forecast.mutate(plan)}
              disabled={forecast.isPending}
            >
              Forecast
            </Button>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[880px] text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              {["Id", "Task", "Best", "Likely", "Worst", "Depends on", "Source", ""].map((h) => (
                <th key={h} className="px-2 py-1.5 font-medium first:pl-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, i, key }) => (
              <tr key={key} className="border-t border-border/50">
                <td className="py-1 pl-4">
                  <input
                    aria-label="Task id"
                    value={t.id}
                    onChange={(e) => update(i, { id: e.target.value })}
                    className={cn(inputClass, "w-20 font-mono")}
                  />
                </td>
                <td className="px-2">
                  <input
                    aria-label="Task name"
                    value={t.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className={inputClass}
                  />
                </td>
                {(["optimistic", "likely", "pessimistic"] as const).map((k) => (
                  <td key={k} className="px-2">
                    <input
                      aria-label={`${k} days`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={t.days[k]}
                      onChange={(e) => setDays(i, k, Number(e.target.value))}
                      className={cn(inputClass, "tabular w-16 font-mono")}
                    />
                  </td>
                ))}
                <td className="px-2">
                  <input
                    aria-label="Depends on"
                    value={t.depends_on.join(", ")}
                    onChange={(e) =>
                      update(i, {
                        depends_on: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className={cn(inputClass, "w-36 font-mono")}
                  />
                </td>
                <td className="px-2">
                  <input
                    aria-label={`Source for ${t.name}`}
                    value={t.source}
                    placeholder="estimate source"
                    onChange={(e) => update(i, { source: e.target.value })}
                    className={cn(inputClass, "w-44", !t.source.trim() && "border-risk/60")}
                  />
                </td>
                <td className="pr-4 text-right">
                  <button
                    type="button"
                    aria-label={`Remove ${t.name}`}
                    onClick={() => removeTask(i)}
                    className="rounded px-1.5 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-4 border-t border-border/50 p-4">
          <NumberField
            id="plan-deadline"
            label="Deadline"
            unit="days"
            value={plan.deadline_days ?? 0}
            onChange={(v) => setPlan({ ...plan, deadline_days: v > 0 ? v : null })}
            min={0}
            max={365}
            step={1}
          />
          <NumberField
            id="plan-budget"
            label="Budget"
            unit={plan.currency}
            value={plan.budget ?? 0}
            onChange={(v) => setPlan({ ...plan, budget: v > 0 ? v : null })}
            min={0}
            max={1e7}
            step={100}
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Currency</span>
            <input
              aria-label="Currency"
              value={plan.currency}
              onChange={(e) => setPlan({ ...plan, currency: e.target.value.slice(0, 8) })}
              className={cn(inputClass, "w-20 font-mono")}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Start date</span>
            <input
              aria-label="Start date"
              type="date"
              value={plan.start_date ?? ""}
              onChange={(e) => setPlan({ ...plan, start_date: e.target.value || null })}
              className={cn(inputClass, "w-40 font-mono")}
            />
          </label>
          {save.error && <p className="text-xs text-destructive">{save.error.message}</p>}
          {save.isSuccess && <p className="self-end text-xs text-ok">Saved</p>}
        </div>
      </Panel>

      <Panel
        title="Assumptions"
        description="Every schedule or budget assumption with where it came from. An empty source is flagged below."
        actions={<Button onClick={addAssumption}>Add assumption</Button>}
        bodyClassName="overflow-x-auto"
      >
        {plan.assumptions.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            No assumptions recorded. Add the ones the forecast relies on (workshop access, team
            availability, supplier lead times).
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                {["Id", "Assumption", "Value", "Unit", "Source", "Basis", ""].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium first:pl-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.assumptions.map((a, i) => (
                <tr key={assumptionKeys[i] ?? a.id} className="border-t border-border/50">
                  <td className="py-1 pl-4">
                    <input
                      aria-label="Assumption id"
                      value={a.id}
                      onChange={(e) => updateAssumption(i, { id: e.target.value })}
                      className={cn(inputClass, "w-16 font-mono")}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Assumption text"
                      value={a.text}
                      onChange={(e) => updateAssumption(i, { text: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Assumption value"
                      type="number"
                      value={a.value ?? ""}
                      onChange={(e) =>
                        updateAssumption(i, {
                          value: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className={cn(inputClass, "tabular w-20 font-mono")}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Assumption unit"
                      value={a.unit}
                      onChange={(e) => updateAssumption(i, { unit: e.target.value })}
                      className={cn(inputClass, "w-16")}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label={`Source for ${a.text}`}
                      value={a.source}
                      placeholder="document, email or measurement"
                      onChange={(e) => updateAssumption(i, { source: e.target.value })}
                      className={cn(inputClass, "w-52", !a.source.trim() && "border-risk/60")}
                    />
                  </td>
                  <td className="px-2">
                    <select
                      aria-label={`Basis for ${a.text}`}
                      value={a.provenance}
                      onChange={(e) =>
                        updateAssumption(i, {
                          provenance: e.target.value as PlanAssumption["provenance"],
                        })
                      }
                      className={cn(inputClass, "w-28")}
                    >
                      <option value="official">official</option>
                      <option value="measured">measured</option>
                      <option value="estimated">estimated</option>
                      <option value="assumed">assumed</option>
                    </select>
                  </td>
                  <td className="pr-4 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${a.text}`}
                      onClick={() => removeAssumption(i)}
                      className="rounded px-1.5 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Scorecard"
        description="The project-management claims we intend to make, their points and the evidence that supports them."
        actions={
          <>
            <span className="self-center text-xs tabular-nums text-muted-foreground">
              {complete}/{declared} points evidenced
            </span>
            <Button onClick={addScore}>Add criterion</Button>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        {plan.scorecard.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            No criteria recorded. Enter the scorecard areas from the India NF competition
            regulations; weights stay as the team declares them, not guessed here.
          </p>
        ) : (
          <table className="w-full min-w-[840px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                {["Id", "Criterion", "Points", "Claim", "Evidence", "Status", ""].map((h) => (
                  <th key={h} className="px-2 py-1.5 font-medium first:pl-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.scorecard.map((item, i) => (
                <tr key={scoreKeys[i] ?? item.id} className="border-t border-border/50">
                  <td className="py-1 pl-4">
                    <input
                      aria-label="Criterion id"
                      value={item.id}
                      onChange={(e) => updateScore(i, { id: e.target.value })}
                      className={cn(inputClass, "w-16 font-mono")}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Criterion"
                      value={item.criterion}
                      onChange={(e) => updateScore(i, { criterion: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Points"
                      type="number"
                      min={0}
                      value={item.points ?? ""}
                      onChange={(e) =>
                        updateScore(i, {
                          points: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      className={cn(inputClass, "tabular w-16 font-mono")}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label="Claim"
                      value={item.claim}
                      onChange={(e) => updateScore(i, { claim: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2">
                    <input
                      aria-label={`Evidence for ${item.criterion}`}
                      value={item.evidence}
                      placeholder="screen, page or artifact"
                      onChange={(e) => updateScore(i, { evidence: e.target.value })}
                      className={cn(inputClass, "w-52", !item.evidence.trim() && "border-risk/60")}
                    />
                  </td>
                  <td className="px-2">
                    <select
                      aria-label={`Status for ${item.criterion}`}
                      value={item.status}
                      onChange={(e) =>
                        updateScore(i, { status: e.target.value as ScoreItem["status"] })
                      }
                      className={cn(inputClass, "w-24")}
                    >
                      <option value="missing">missing</option>
                      <option value="partial">partial</option>
                      <option value="complete">complete</option>
                    </select>
                  </td>
                  <td className="pr-4 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${item.criterion}`}
                      onClick={() => removeScore(i)}
                      className="rounded px-1.5 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Evidence gaps"
        description="Derived from this plan only. A gap means the plan cannot point at supporting material yet."
        actions={
          <ProvenanceBadge
            value="estimated"
            title="Derived from the plan's own source fields; not an audit"
          />
        }
      >
        {gaps.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            Every task, assumption and scorecard claim has a source and complete status.
          </p>
        ) : (
          <ul className="divide-y text-xs">
            {gaps.map((gap) => (
              <li key={`${gap.kind}-${gap.id}`} className="flex gap-3 px-4 py-1.5">
                <span className="w-20 shrink-0 font-mono text-muted-foreground">{gap.kind}</span>
                <span>{gap.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Forecast"
        actions={f && <ProvenanceBadge value="predicted" />}
        bodyClassName="flex flex-col gap-4 p-4"
      >
        {forecast.error ? (
          <p className="text-xs text-destructive">{forecast.error.message}</p>
        ) : !f ? (
          <p className="text-xs text-muted-foreground">
            Press Forecast to simulate the plan 10,000 times. Each forecast is saved with the exact
            plan that produced it.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Most likely plan" value={f.likely_days.toFixed(1)} unit="days" />
              <Metric label="50% chance by" value={f.p50_days.toFixed(1)} unit="days" />
              <Metric label="80% chance by" value={f.p80_days.toFixed(1)} unit="days" />
              <Metric
                label="On time"
                value={pct(f.finish_probability)}
                unit="%"
                tone={
                  f.finish_probability != null && f.finish_probability < 0.5
                    ? "danger"
                    : f.finish_probability != null && f.finish_probability < 0.8
                      ? "risk"
                      : "default"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Saved as {f.forecast_id}. Cost p50 {f.cost_p50?.toFixed(0) ?? "—"} {plan.currency} ·
              budget chance {pct(f.budget_probability)}%.
            </p>
            <div>
              <h3 className="mb-2 text-xs font-medium">Critical path</h3>
              <div className="flex flex-wrap gap-1.5">
                {f.critical_path.map((id) => (
                  <span
                    key={id}
                    className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium">
                How often each task decides the finish date
              </h3>
              <ul className="flex flex-col gap-1.5">
                {Object.entries(f.criticality).map(([id, share]) => (
                  <li
                    key={id}
                    className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-xs"
                  >
                    <span className="truncate font-mono">{id}</span>
                    <span className="h-2 overflow-hidden rounded-sm bg-muted">
                      <span
                        className={cn("block h-full", share > 0.5 ? "bg-risk" : "bg-line-strong")}
                        style={{ width: `${share * 100}%` }}
                      />
                    </span>
                    <span className="tabular text-right font-mono text-muted-foreground">
                      {pct(share)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Saved forecasts"
        actions={
          forecasts.data && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {forecasts.data.length} stored
            </span>
          )
        }
      >
        {forecasts.isPending ? (
          <Skeleton className="m-4 h-16" />
        ) : forecasts.isError ? (
          <p role="alert" className="p-4 text-xs text-destructive">
            {forecasts.error.message}
          </p>
        ) : !forecasts.data?.length ? (
          <p className="p-4 text-xs text-muted-foreground">
            No forecast saved yet. A forecast stores the plan and result as evidence, so an earlier
            prediction can be compared with what actually happened.
          </p>
        ) : (
          <ul className="divide-y text-xs">
            {forecasts.data.map((entry) => (
              <li
                key={entry.forecast_id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2"
              >
                <span className="tabular-nums text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                <span className="tabular-nums">
                  p50 {entry.p50_days.toFixed(1)} d · p80 {entry.p80_days.toFixed(1)} d · on time{" "}
                  {pct(entry.finish_probability)}%
                </span>
                <span className="truncate font-mono text-2xs text-muted-foreground">
                  {entry.critical_path.join(" → ")} · {entry.plan_hash.slice(0, 20)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
