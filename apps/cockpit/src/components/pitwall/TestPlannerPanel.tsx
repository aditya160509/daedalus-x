"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DEFAULT_CAR, DEFAULT_ESTIMATE } from "@/app/race/raceInputsState";
import {
  TestProtocolPicker,
  TEST_PROTOCOLS,
  type TestProtocolId,
} from "@/components/forms/TestProtocolPicker";
import { AdvancedFields } from "@/components/ui/advanced-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { getTestPlan } from "@/lib/api";
import { estimateThrust, parseThrustCsv, type ThrustTrace } from "@/lib/thrust";

const PARAMETERS = {
  cda: "Drag area (CdA)",
  crr: "Rolling resistance (Crr)",
  thrust: "Thrust scale",
} as const;
type Parameter = keyof typeof PARAMETERS;

export function TestPlannerPanel() {
  const [protocol, setProtocol] = useState<TestProtocolId>("custom");
  const [values, setValues] = useState({
    cda: DEFAULT_CAR.cdaCm2,
    crr: DEFAULT_CAR.crr,
    thrustScale: 1,
    rho: DEFAULT_CAR.rho,
    mass: DEFAULT_CAR.massG,
    ballast: 5,
    track: DEFAULT_CAR.trackM,
    shortTrack: 10,
    noise: 5,
    prior: 20,
    budget: 3,
    fastSpeed: 10,
    fastDistance: 8,
    slowSpeed: 2,
    slowDistance: 1,
  });
  const [curve, setCurve] = useState<ThrustTrace | null>(null);
  const [curveName, setCurveName] = useState("");
  const [fileError, setFileError] = useState("");
  const [includeCoast, setIncludeCoast] = useState(true);
  const plan = useMutation({ mutationFn: getTestPlan });
  const change = (key: keyof typeof values, value: number) => {
    setValues((v) => ({ ...v, [key]: value }));
    setProtocol("custom");
    plan.reset();
  };
  const fields: {
    key: keyof typeof values;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "cda", label: "Nominal CdA", unit: "cm²", min: 0.001, max: 500, step: 0.1 },
    { key: "crr", label: "Nominal Crr", unit: "1", min: 0.0001, max: 1, step: 0.001 },
    { key: "thrustScale", label: "Nominal thrust scale", unit: "1", min: 0.01, max: 5, step: 0.01 },
    { key: "rho", label: "Air density", unit: "kg/m³", min: 0.501, max: 1.499, step: 0.01 },
    { key: "mass", label: "Base mass", unit: "g", min: 1, max: 995, step: 1 },
    { key: "ballast", label: "Added ballast", unit: "g", min: 0, max: 999, step: 1 },
    { key: "track", label: "Track length", unit: "m", min: 0.1, max: 100, step: 1 },
    { key: "shortTrack", label: "Alternative length", unit: "m", min: 0.1, max: 100, step: 1 },
    { key: "noise", label: "Timing noise, SD", unit: "ms", min: 0.01, max: 1000, step: 0.1 },
    { key: "prior", label: "Prior relative SD", unit: "%", min: 0.1, max: 500, step: 1 },
    { key: "budget", label: "Test budget", unit: "tests", min: 1, max: 20, step: 1 },
    ...(includeCoast
      ? [
          {
            key: "fastSpeed" as const,
            label: "Fast coast initial speed",
            unit: "m/s",
            min: 0.1,
            max: 40,
            step: 0.1,
          },
          {
            key: "fastDistance" as const,
            label: "Fast coast distance",
            unit: "m",
            min: 0.1,
            max: 100,
            step: 0.1,
          },
          {
            key: "slowSpeed" as const,
            label: "Slow coast initial speed",
            unit: "m/s",
            min: 0.1,
            max: 40,
            step: 0.1,
          },
          {
            key: "slowDistance" as const,
            label: "Slow coast distance",
            unit: "m",
            min: 0.1,
            max: 100,
            step: 0.1,
          },
        ]
      : []),
  ];
  const valid =
    fields.every(
      (f) => Number.isFinite(values[f.key]) && values[f.key] >= f.min && values[f.key] <= f.max,
    ) &&
    values.mass + values.ballast <= 1000 &&
    Number.isInteger(values.budget) &&
    !fileError;
  function submit() {
    const masses = [values.mass, values.mass + values.ballast];
    plan.mutate({
      thrust: curve ?? estimateThrust(DEFAULT_ESTIMATE),
      cda_m2: values.cda / 10000,
      crr: values.crr,
      thrust_scale: values.thrustScale,
      rho_kg_m3: values.rho,
      sigma_s: values.noise / 1000,
      prior_relative_sd: values.prior / 100,
      budget: values.budget,
      candidates: [values.track, values.shortTrack].flatMap((track_m) =>
        masses.map((mass) => ({ track_m, mass_kg: mass / 1000 })),
      ),
      coast_downs: includeCoast
        ? [
            {
              speed_mps: values.fastSpeed,
              distance_m: values.fastDistance,
              mass_kg: values.mass / 1000,
            },
            {
              speed_mps: values.slowSpeed,
              distance_m: values.slowDistance,
              mass_kg: values.mass / 1000,
            },
          ]
        : [],
    });
  }
  const result = plan.data;
  return (
    <Panel
      title="Physical test planner"
      actions={<ProvenanceBadge value="predicted" />}
      bodyClassName="overflow-y-auto"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <fieldset
          disabled={plan.isPending}
          className="min-w-0 space-y-4 border-b p-4 lg:border-r lg:border-b-0"
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Compare timing runs at two masses and two lengths, with optional fast and slow
            coast-downs. Edit the assumptions before planning.
          </p>
          <TestProtocolPicker
            value={protocol}
            onChange={(id) => {
              setProtocol(id);
              if (id !== "custom") {
                const preset = TEST_PROTOCOLS[id];
                setValues((v) => ({
                  ...v,
                  track: preset.trackM,
                  shortTrack: preset.alternativeTrackM,
                  noise: preset.timingSdMs,
                  budget: preset.budget,
                }));
                setIncludeCoast(preset.coastDown);
              }
              plan.reset();
            }}
          />
          <div className="space-y-3">
            {fields
              .filter((f) => ["mass", "track", "noise", "budget"].includes(f.key))
              .map((f) => (
                <NumberField
                  key={f.key}
                  id={`planner-${f.key}`}
                  label={f.label}
                  unit={f.unit}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={values[f.key]}
                  onChange={(v) => change(f.key, v)}
                />
              ))}
          </div>
          <AdvancedFields
            description="Car priors, density, ballast, alternative track, coast-down candidates and thrust curve. Hidden assumptions still participate in the calculation."
            disabled={plan.isPending}
            invalidCount={
              fields.filter(
                (f) =>
                  !["mass", "track", "noise", "budget"].includes(f.key) &&
                  (!Number.isFinite(values[f.key]) ||
                    values[f.key] < f.min ||
                    values[f.key] > f.max),
              ).length +
              (fileError ? 1 : 0) +
              (values.mass + values.ballast > 1000 ? 1 : 0)
            }
          >
            <div className="space-y-3">
              {fields
                .filter(
                  (f) =>
                    ![
                      "mass",
                      "track",
                      "noise",
                      "budget",
                      "fastSpeed",
                      "fastDistance",
                      "slowSpeed",
                      "slowDistance",
                    ].includes(f.key),
                )
                .map((f) => (
                  <NumberField
                    key={f.key}
                    id={`planner-${f.key}`}
                    label={f.label}
                    unit={f.unit}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={values[f.key]}
                    onChange={(v) => change(f.key, v)}
                  />
                ))}
            </div>
            {values.mass + values.ballast > 1000 && (
              <p role="alert" className="text-xs text-destructive">
                Base mass plus ballast must not exceed 1000 g.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCoast}
                onChange={(e) => {
                  setIncludeCoast(e.target.checked);
                  setProtocol("custom");
                  plan.reset();
                }}
              />{" "}
              Include coast-down candidates
            </label>
            {includeCoast && (
              <div className="space-y-3">
                {fields.slice(11).map((f) => (
                  <NumberField
                    key={f.key}
                    id={`planner-${f.key}`}
                    label={f.label}
                    unit={f.unit}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={values[f.key]}
                    onChange={(v) => change(f.key, v)}
                  />
                ))}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="planner-thrust" className="text-xs">
                Thrust curve CSV (time s, force N)
              </label>
              <Input
                id="planner-thrust"
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  plan.reset();
                  setCurve(null);
                  setCurveName("");
                  setFileError("");
                  if (!file) return;
                  try {
                    setCurve(parseThrustCsv(await file.text()));
                    setCurveName(file.name);
                  } catch (error) {
                    setFileError(error instanceof Error ? error.message : "Could not read file");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {curve
                  ? `Using ${curveName}. Verify its source and units.`
                  : "Default: Race workspace estimated thrust curve (20 N peak, 0.02 s rise, 0.06 s decay, 0.4 s burn)."}
              </p>
              {fileError && (
                <p role="alert" className="text-xs text-destructive">
                  {fileError}
                </p>
              )}
            </div>
          </AdvancedFields>
          <Button disabled={!valid || plan.isPending} onClick={submit}>
            Calculate plan
          </Button>
        </fieldset>
        <div className="min-w-0 space-y-4 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Expected uncertainty reduction is a model prediction, not a measured outcome. This
            planner has not been physically validated. Check test feasibility and rerun with
            measured inputs when available.
          </p>
          {plan.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : plan.isError ? (
            <div role="alert" className="text-sm text-destructive">
              {plan.error.message}
            </div>
          ) : !result ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              No plan calculated yet. Set the assumptions and select Calculate plan.
            </p>
          ) : result.steps.length === 0 ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              No tests were returned for these inputs.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium">Recommended sequence</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each selection maximizes the next information gain given earlier selections. A
                  test can be repeated.
                </p>
              </div>
              <ol className="space-y-2">
                {result.steps.map((step, i) => (
                  <li key={`${i}-${step.kind}`} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="font-medium">
                        {i + 1}. {step.kind === "timing_run" ? "Timing run" : "Coast-down"}
                      </strong>
                      <span className="font-mono text-xs tabular-nums">
                        +{step.information_gain_nats.toFixed(3)} nats
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {step.kind === "timing_run"
                        ? `${step.track_m} m track · ${(step.mass_kg * 1000).toFixed(1)} g mass`
                        : `${step.speed_mps} m/s initial speed · ${step.distance_m} m distance · ${(step.mass_kg * 1000).toFixed(1)} g mass`}
                    </p>
                    <p className="mt-2 text-xs">
                      Expected relative SD:{" "}
                      {(Object.keys(PARAMETERS) as Parameter[])
                        .map((k) => `${PARAMETERS[k]} ${(step.relative_sd[k] * 100).toFixed(1)}%`)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="rounded-lg border p-3 text-xs leading-relaxed">
                <p>
                  Starting relative SD:{" "}
                  {(Object.keys(PARAMETERS) as Parameter[])
                    .map(
                      (k) =>
                        `${PARAMETERS[k]} ${(result.starting_relative_sd[k] * 100).toFixed(1)}%`,
                    )
                    .join(" · ")}
                </p>
                <p className="mt-2">
                  {result.poorly_identified.length
                    ? `Still above half the starting SD: ${result.poorly_identified.map((k) => PARAMETERS[k as Parameter] ?? k).join(", ")}.`
                    : "All parameters fall to half their starting SD or less in this approximation."}
                </p>
              </div>
              <div className="text-xs leading-relaxed text-muted-foreground">
                <h3 className="font-medium text-foreground">Model assumptions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                  <li>
                    All candidates use the same air density; density variation is not ranked. Timing
                    and coast-down tests share the same assumed timing noise.
                  </li>
                  <li>
                    Coast-down initial speed is known exactly; the model assumes level motion and no
                    thrust. No completed tests or measured outcomes are included.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
