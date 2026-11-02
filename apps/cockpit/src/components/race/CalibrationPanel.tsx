"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DEFAULT_CAR, DEFAULT_ESTIMATE } from "@/app/race/raceInputsState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { calibrateBayesian, previewTimingImport, type TimingImport } from "@/lib/api";
import { estimateThrust, parseThrustCsv, type ThrustTrace } from "@/lib/thrust";

const LABELS: Record<string, { label: string; unit: string; scale: number }> = {
  cda_m2: { label: "CdA", unit: "cm²", scale: 10000 },
  crr: { label: "Crr", unit: "1", scale: 1 },
  thrust_scale: { label: "Thrust scale", unit: "1", scale: 1 },
  extra_noise_s: { label: "Extra noise SD", unit: "ms", scale: 1000 },
  offset_s: { label: "Model offset", unit: "ms", scale: 1000 },
};

export function CalibrationPanel() {
  const [training, setTraining] = useState<TimingImport | null>(null);
  const [held, setHeld] = useState<TimingImport | null>(null);
  const [curve, setCurve] = useState<ThrustTrace | null>(null);
  const [curveName, setCurveName] = useState("");
  const [curveError, setCurveError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [values, setValues] = useState({
    mass: DEFAULT_CAR.massG,
    track: DEFAULT_CAR.trackM,
    heldTrack: DEFAULT_CAR.trackM,
    sigma: 5,
    cda: DEFAULT_CAR.cdaCm2,
    crr: DEFAULT_CAR.crr,
    scale: 1,
    logSd: 0.3,
    noise: 10,
    offset: 20,
    rho: DEFAULT_CAR.rho,
  });
  const fit = useMutation({ mutationFn: calibrateBayesian });
  const upload = useMutation({
    mutationFn: ({ file }: { file: File; target: "training" | "held" }) =>
      previewTimingImport(file),
    onSuccess: (data, variables) => {
      if (variables.target === "training") setTraining(data);
      else setHeld(data);
      fit.reset();
    },
  });
  const fields = [
    {
      key: "mass" as const,
      label: "Mass if absent from file",
      unit: "g",
      min: 1,
      max: 1000,
      step: 1,
    },
    {
      key: "track" as const,
      label: "Calibration track length",
      unit: "m",
      min: 0.1,
      max: 100,
      step: 1,
    },
    ...(held
      ? [
          {
            key: "heldTrack" as const,
            label: "Held-out track length",
            unit: "m",
            min: 0.1,
            max: 100,
            step: 1,
          },
        ]
      : []),
    {
      key: "sigma" as const,
      label: "Timing SD per run",
      unit: "ms",
      min: 0.01,
      max: 1000,
      step: 0.1,
    },
    {
      key: "cda" as const,
      label: "Prior median CdA",
      unit: "cm²",
      min: 0.001,
      max: 500,
      step: 0.1,
    },
    { key: "crr" as const, label: "Prior median Crr", unit: "1", min: 0.0001, max: 1, step: 0.001 },
    {
      key: "scale" as const,
      label: "Prior median thrust scale",
      unit: "1",
      min: 0.01,
      max: 5,
      step: 0.01,
    },
    {
      key: "logSd" as const,
      label: "Prior log SD (all three)",
      unit: "1",
      min: 0.01,
      max: 2,
      step: 0.01,
    },
    {
      key: "noise" as const,
      label: "Extra noise prior scale",
      unit: "ms",
      min: 0.01,
      max: 1000,
      step: 1,
    },
    { key: "offset" as const, label: "Offset prior SD", unit: "ms", min: 0.01, max: 1000, step: 1 },
    {
      key: "rho" as const,
      label: "Air density",
      unit: "kg/m³",
      min: 0.501,
      max: 1.499,
      step: 0.01,
    },
  ];
  const valid =
    fields.every(
      (f) => Number.isFinite(values[f.key]) && values[f.key] >= f.min && values[f.key] <= f.max,
    ) &&
    !!training &&
    training.rows.length <= 30 &&
    (!held || held.rows.length <= 20) &&
    confirmed &&
    !curveError &&
    !upload.isPending;
  const runRows = (data: TimingImport, track_m: number) =>
    data.rows.map((r) => ({
      time_s: r.time_s,
      track_m,
      sigma_s: values.sigma / 1000,
      mass_kg: r.mass_kg ?? values.mass / 1000,
    }));
  const result = fit.data;
  return (
    <Panel
      title="Bayesian calibration"
      actions={<ProvenanceBadge value="estimated" />}
      bodyClassName="overflow-y-auto"
    >
      <div className="grid lg:grid-cols-[minmax(260px,320px)_1fr]">
        <fieldset
          disabled={fit.isPending || upload.isPending}
          className="min-w-0 space-y-4 border-b p-4 lg:border-r lg:border-b-0"
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Upload measured car-only finish times (CSV or XLSX). Header <code>time [s]</code> is
            required; optional <code>mass [g]</code>, run, lane and reaction columns are previewed.
            Reaction is not subtracted by the model. Files are parsed for this calculation and not
            saved to the evidence store.
          </p>
          {(["training", "held"] as const).map((target) => (
            <div key={target} className="space-y-1">
              <label className="text-xs" htmlFor={`cal-${target}`}>
                {target === "training"
                  ? "Calibration timing file"
                  : "Separate held-out timing file (optional)"}
              </label>
              <Input
                id={`cal-${target}`}
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (target === "training") setTraining(null);
                  else setHeld(null);
                  fit.reset();
                  upload.reset();
                  if (file) upload.mutate({ file, target });
                }}
              />
              <p className="text-xs text-muted-foreground">
                {(target === "training" ? training : held)?.filename ?? "No file selected"}
              </p>
            </div>
          ))}
          {upload.isPending && <p className="text-xs">Reading file…</p>}
          {upload.isError && (
            <p role="alert" className="text-xs text-destructive">
              {upload.error.message}
            </p>
          )}
          <div className="space-y-3">
            {fields.map((f) => (
              <NumberField
                key={f.key}
                id={`cal-${f.key}`}
                label={f.label}
                unit={f.unit}
                min={f.min}
                max={f.max}
                step={f.step}
                value={values[f.key]}
                onChange={(value) => {
                  setValues((v) => ({ ...v, [f.key]: value }));
                  fit.reset();
                }}
              />
            ))}
          </div>
          <div className="space-y-1">
            <label htmlFor="cal-thrust" className="text-xs">
              Thrust curve CSV (time s, force N)
            </label>
            <Input
              id="cal-thrust"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                setCurve(null);
                setCurveName("");
                setCurveError("");
                fit.reset();
                if (!file) return;
                try {
                  setCurve(parseThrustCsv(await file.text()));
                  setCurveName(file.name);
                } catch (error) {
                  setCurveError(error instanceof Error ? error.message : "Could not read file");
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {curve
                ? `Using ${curveName}; verify its source and units.`
                : "Default: Race estimated curve (20 N peak, 0.02 s rise, 0.06 s decay, 0.4 s burn), not a measurement."}
            </p>
            {curveError && (
              <p role="alert" className="text-xs text-destructive">
                {curveError}
              </p>
            )}
          </div>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                fit.reset();
              }}
            />
            I confirm these are car-only times, and any held-out file contains independent runs
            excluded from calibration.
          </label>
          <Button
            disabled={!valid || fit.isPending}
            onClick={() => {
              if (!training) return;
              const thrust = curve ?? estimateThrust(DEFAULT_ESTIMATE);
              fit.mutate({
                points: runRows(training, values.track),
                held_out: held ? runRows(held, values.heldTrack) : [],
                thrust_t_s: thrust.t_s,
                thrust_force_n: thrust.force_n,
                cda_m2: values.cda / 10000,
                crr: values.crr,
                thrust_scale: values.scale,
                log_sd: values.logSd,
                extra_noise_scale_s: values.noise / 1000,
                offset_sd_s: values.offset / 1000,
                rho_kg_m3: values.rho,
                seed: 0,
              });
            }}
          >
            Calibrate
          </Button>
        </fieldset>
        <div className="min-w-0 space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Posterior estimates depend on the supplied runs, thrust curve and priors. Timing alone
            may not identify drag and rolling separately. No physical validation is implied.
          </p>
          {[training, held]
            .filter((x): x is TimingImport => !!x)
            .map((data) => (
              <div
                key={`${data === training ? "training" : "held"}-${data.filename}`}
                className="rounded-lg border p-3 text-xs"
              >
                <h3 className="font-medium">
                  {data === training ? "Calibration" : "Held-out"} preview · {data.rows.length} runs
                </h3>
                <p className="mt-1 text-muted-foreground">
                  Declared/assumed file units:{" "}
                  {Object.entries(data.units)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                  . Per-row mass overrides fallback; track and timing SD are shared.
                </p>
                {data.warnings.map((w) => (
                  <p key={w} className="mt-1">
                    {w}
                  </p>
                ))}
                <ul className="mt-2 space-y-1">
                  {data.rows.map((r) => (
                    <li key={r.run_no}>
                      Run {r.run_no}
                      {r.lane ? ` · lane ${r.lane}` : ""}: {r.time_s.toFixed(4)} s ·{" "}
                      {r.mass_kg == null ? "fallback mass" : `${(r.mass_kg * 1000).toFixed(1)} g`}
                      {r.reaction_s == null ? "" : ` · reaction ${r.reaction_s} s (not subtracted)`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {training && training.rows.length > 30 && (
            <p role="alert">At most 30 calibration runs per calculation.</p>
          )}
          {held && held.rows.length > 20 && (
            <p role="alert">At most 20 held-out runs per calculation.</p>
          )}
          {fit.isPending ? (
            <Skeleton className="h-48" />
          ) : fit.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {fit.error.message}
            </p>
          ) : !result ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              No calibration calculated. Upload timing data, review the assumptions and confirm the
              timing definition.
            </p>
          ) : (
            <>
              <div>
                <h3 className="font-medium">Posterior summaries</h3>
                <p className="text-xs text-muted-foreground">
                  Median and 5th–95th percentiles · effective sample size{" "}
                  {result.effective_sample_size.toFixed(1)} · fixed seed {result.seed}
                </p>
              </div>
              <div className="space-y-2">
                {Object.entries(result.summaries).map(([key, s]) => {
                  const label = LABELS[key];
                  if (!label) return null;
                  return (
                    <div key={key} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>{label.label}</span>
                        <span className="font-mono">
                          {(s.median * label.scale).toFixed(3)} {label.unit}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        90% interval {(s.p05 * label.scale).toFixed(3)} to{" "}
                        {(s.p95 * label.scale).toFixed(3)} {label.unit}
                        {s.information_gain == null
                          ? ""
                          : ` · variance reduction ${(s.information_gain * 100).toFixed(1)}%`}
                      </p>
                    </div>
                  );
                })}
              </div>
              {result.warnings.map((w) => (
                <p key={w} className="text-xs">
                  {w}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">
                Log-normal priors for CdA, Crr and thrust share the entered log SD; extra noise has
                a half-normal prior and offset a zero-centred normal prior. Variance reduction is
                relative to the prior, not a guarantee of truth. 300 particles, 2 adaptation stages
                and 300 draws.
              </p>
              <h3 className="font-medium">Held-out predictions</h3>
              {result.held_out.length ? (
                <div className="space-y-2">
                  {result.held_out.map((r, i) => (
                    <p
                      key={held?.rows[i]?.run_no ?? r.measured_s}
                      className="rounded-lg border p-3 text-xs"
                    >
                      Run {held?.rows[i]?.run_no}: measured {r.measured_s.toFixed(4)} s · predicted
                      median {r.median_s.toFixed(4)} s · 90% interval {r.p05_s.toFixed(4)}–
                      {r.p95_s.toFixed(4)} s · error {r.error_s.toFixed(4)} s
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No held-out runs provided; out-of-sample validation has not been performed.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
