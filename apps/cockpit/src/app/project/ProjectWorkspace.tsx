"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
  saveProjectPlan,
  type PlanTask,
  type ProjectPlan,
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
  },
  {
    id: "cfd",
    name: "CFD runs",
    days: { optimistic: 3, likely: 5, pessimistic: 9 },
    depends_on: ["cad"],
    cost: null,
    owner: "",
  },
  {
    id: "cnc",
    name: "CNC both cars",
    days: { optimistic: 2, likely: 3, pessimistic: 6 },
    depends_on: ["cfd"],
    cost: null,
    owner: "",
  },
  {
    id: "drawings",
    name: "Engineering drawings",
    days: { optimistic: 2, likely: 3, pessimistic: 5 },
    depends_on: ["cad"],
    cost: null,
    owner: "",
  },
  {
    id: "portfolio",
    name: "Portfolios",
    days: { optimistic: 6, likely: 8, pessimistic: 14 },
    depends_on: ["cfd"],
    cost: null,
    owner: "",
  },
];

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}`);

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
      initial={empty ? { tasks: EXAMPLE, deadline_days: 30, budget: null } : saved.data}
      example={empty}
    />
  );
}

function PlanEditor({ initial, example }: { initial: ProjectPlan; example: boolean }) {
  const [plan, setPlan] = useState<ProjectPlan>(initial);
  const [isExample, setIsExample] = useState(example);
  const [rowKeys, setRowKeys] = useState(() => initial.tasks.map((t, i) => `${t.id}-${i}`));
  const [nextKey, setNextKey] = useState(initial.tasks.length);
  const save = useMutation({ mutationFn: saveProjectPlan, onSuccess: () => setIsExample(false) });
  const forecast = useMutation({ mutationFn: forecastProject });

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
        },
      ],
    });
  };
  const removeTask = (i: number) => {
    setRowKeys(rowKeys.filter((_, j) => j !== i));
    setPlan({ ...plan, tasks: plan.tasks.filter((_, j) => j !== i) });
  };
  const rows = plan.tasks.map((t, i) => ({ t, i, key: rowKeys[i] ?? t.id }));
  const f = forecast.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 overflow-y-auto p-3">
      <Panel
        title="Plan"
        description="Three-point estimates in days: best case, most likely, worst case. Depends on: task ids, comma separated."
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
        <table className="w-full min-w-[720px] text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              {["Id", "Task", "Best", "Likely", "Worst", "Depends on", ""].map((h) => (
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
                    className="w-20 rounded border border-input bg-background px-1.5 py-1 font-mono"
                  />
                </td>
                <td className="px-2">
                  <input
                    aria-label="Task name"
                    value={t.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="w-full rounded border border-input bg-background px-1.5 py-1"
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
                      className="tabular w-16 rounded border border-input bg-background px-1.5 py-1 font-mono"
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
                    className="w-40 rounded border border-input bg-background px-1.5 py-1 font-mono"
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
        <div className="flex flex-wrap gap-4 border-t border-border/50 p-4">
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
          {save.error && <p className="text-xs text-destructive">{save.error.message}</p>}
          {save.isSuccess && <p className="self-end text-xs text-ok">Saved</p>}
        </div>
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
            Press Forecast to simulate the plan 10,000 times.
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
    </div>
  );
}
