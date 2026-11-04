"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_CAR, DEFAULT_ESTIMATE } from "@/app/race/raceInputsState";
import {
  TestProtocolPicker,
  TEST_PROTOCOLS,
  type TestProtocolId,
} from "@/components/forms/TestProtocolPicker";
import { AdvancedFields } from "@/components/ui/advanced-fields";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { NumberField, Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import {
  calibrateBayesian,
  getCalibrationStudy,
  listCalibrationStudies,
  previewTimingImport,
  type CalibrationStudyDetail,
  type TimingImport,
} from "@/lib/api";
import { comparisonRows, type StudyComparisonRow } from "@/lib/calibrationCompare";
import { estimateThrust, parseThrustCsv, type ThrustTrace } from "@/lib/thrust";
import { outlierRowIndices } from "@/lib/timingRows";
import { HeldOutPlot, PosteriorIntervals } from "./CalibrationPlots";

type TimingPreview = TimingImport & {
  /** Saved studies do not store the importer's flags; say so instead of inventing them. */
  outliersKnown: boolean;
};

const LABELS: Record<string, { label: string; unit: string; scale: number }> = {
  cda_m2: { label: "CdA", unit: "cm²", scale: 10000 },
  crr: { label: "Crr", unit: "1", scale: 1 },
  thrust_scale: { label: "Thrust scale", unit: "1", scale: 1 },
  extra_noise_s: { label: "Extra noise SD", unit: "ms", scale: 1000 },
  offset_s: { label: "Model offset", unit: "ms", scale: 1000 },
};

const MAX_COMPARE = 5;

const COMPARISON_COLUMNS: DataColumn<StudyComparisonRow>[] = [
  {
    accessorKey: "study_id",
    header: "Study",
    cell: (cell) => (
      <span>
        <span className="font-mono text-muted-foreground">{String(cell.getValue())}</span>
        <span className="block text-2xs text-muted-foreground">
          {new Date(cell.row.original.created_at).toLocaleString()}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "n_runs",
    header: "Runs / held out",
    meta: { numeric: true },
    cell: (cell) => `${String(cell.getValue())} / ${cell.row.original.n_held_out}`,
  },
  {
    accessorKey: "effective_sample_size",
    header: "ESS",
    meta: { numeric: true },
    cell: (cell) => {
      const value = cell.getValue();
      return typeof value === "number" ? value.toFixed(1) : "—";
    },
  },
  {
    accessorKey: "mae_ms",
    header: "Held-out MAE (ms)",
    meta: { numeric: true },
    cell: (cell) => {
      const value = cell.getValue();
      return typeof value === "number" ? value.toFixed(1) : "not evaluated";
    },
  },
  {
    accessorKey: "rmse_ms",
    header: "Held-out RMSE (ms)",
    meta: { numeric: true },
    cell: (cell) => {
      const value = cell.getValue();
      return typeof value === "number" ? value.toFixed(1) : "not evaluated";
    },
  },
  {
    accessorKey: "comparability",
    header: "Held-out set / comparability",
    cell: (cell) => (
      <span>
        <span className="block">{String(cell.getValue())}</span>
        <span className="block text-2xs text-muted-foreground">
          {cell.row.original.source_labels.length
            ? cell.row.original.source_labels.join(", ")
            : "no source label stored"}
        </span>
      </span>
    ),
  },
];

/** Fetch at most five saved studies in pairs; opening the comparison never reruns a fit. */
async function fetchStudyDetails(ids: string[]): Promise<CalibrationStudyDetail[]> {
  const details: CalibrationStudyDetail[] = [];
  for (let index = 0; index < ids.length; index += 2) {
    // oxlint-disable-next-line no-await-in-loop -- batches of two bound concurrent study reads
    details.push(...(await Promise.all(ids.slice(index, index + 2).map(getCalibrationStudy))));
  }
  return details;
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function pointsToImport(
  filename: string,
  points: CalibrationStudyDetail["inputs"]["points"],
): TimingPreview {
  return {
    filename,
    units: {},
    warnings: [],
    outlier_indices: [],
    outliersKnown: false,
    rows: points.map((point, index) => ({
      run_no: index + 1,
      lane: "",
      time_s: point.time_s,
      reaction_s: null,
      mass_kg: point.mass_kg,
      notes: "",
    })),
  };
}

export function CalibrationPanel() {
  const [protocol, setProtocol] = useState<TestProtocolId>("custom");
  const queryClient = useQueryClient();
  const [training, setTraining] = useState<TimingPreview | null>(null);
  const [held, setHeld] = useState<TimingPreview | null>(null);
  const [curve, setCurve] = useState<ThrustTrace | null>(null);
  const [curveName, setCurveName] = useState("");
  const [curveError, setCurveError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [files, setFiles] = useState<{ training: File | null; held: File | null }>({
    training: null,
    held: null,
  });
  const [openedStudy, setOpenedStudy] = useState<string | null>(null);
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
  const studies = useQuery({
    queryKey: ["calibration-studies"],
    queryFn: listCalibrationStudies,
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const comparison = useQuery({
    queryKey: ["calibration-comparison", compareIds],
    queryFn: () => fetchStudyDetails(compareIds),
    enabled: compareIds.length > 0,
  });
  const fit = useMutation({
    mutationFn: calibrateBayesian,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calibration-studies"] });
      void queryClient.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
  const open = useMutation({
    mutationFn: (studyId: string) => getCalibrationStudy(studyId),
    onSuccess: (detail) => {
      const inputs = detail.inputs;
      const points = inputs.points;
      const first = points[0];
      setValues({
        mass: first ? first.mass_kg * 1000 : values.mass,
        track: first ? first.track_m : values.track,
        heldTrack: inputs.held_out[0] ? inputs.held_out[0].track_m : values.heldTrack,
        sigma: first ? first.sigma_s * 1000 : values.sigma,
        cda: inputs.cda_m2 * 10000,
        crr: inputs.crr,
        scale: inputs.thrust_scale,
        logSd: inputs.log_sd,
        noise: inputs.extra_noise_scale_s * 1000,
        offset: inputs.offset_sd_s * 1000,
        rho: inputs.rho_kg_m3,
      });
      setTraining(pointsToImport(detail.study.source_labels[0] ?? "saved calibration", points));
      setHeld(
        inputs.held_out.length
          ? pointsToImport(detail.study.source_labels[1] ?? "saved held-out", inputs.held_out)
          : null,
      );
      setCurve({ t_s: inputs.thrust_t_s, force_n: inputs.thrust_force_n });
      setCurveName("stored thrust curve");
      setCurveError("");
      setConfirmed(false);
      setFiles({ training: null, held: null });
      setOpenedStudy(detail.study.study_id);
      setProtocol("custom");
      fit.reset();
    },
  });
  const upload = useMutation({
    mutationFn: ({ file }: { file: File; target: "training" | "held" }) =>
      previewTimingImport(file),
    onSuccess: (data, variables) => {
      const preview: TimingPreview = { ...data, outliersKnown: true };
      if (variables.target === "training") setTraining(preview);
      else setHeld(preview);
      fit.reset();
      setOpenedStudy(null);
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
  const intervalItems = result
    ? Object.entries(result.summaries).flatMap(([key, summary]) => {
        const label = LABELS[key];
        return label
          ? [
              {
                key,
                label: label.label,
                unit: label.unit,
                p05: summary.p05 * label.scale,
                median: summary.median * label.scale,
                p95: summary.p95 * label.scale,
              },
            ]
          : [];
      })
    : [];
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
            Upload car-only times: CSV/XLSX with <code>time [s]</code> and optional{" "}
            <code>mass [g]</code>. Reaction is not subtracted. Original files, assumptions and
            results are saved as evidence.
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
                  heldTrack: preset.trackM,
                  sigma: preset.timingSdMs,
                }));
              }
              setConfirmed(false);
              setOpenedStudy(null);
              fit.reset();
            }}
          />
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
                  setFiles((f) => ({ ...f, [target]: file ?? null }));
                  setOpenedStudy(null);
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
            {fields
              .filter((f) => ["mass", "track", "sigma"].includes(f.key))
              .map((f) => (
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
                    setProtocol("custom");
                    fit.reset();
                  }}
                />
              ))}
          </div>
          <AdvancedFields
            description="Prior distributions, density, held-out track length and thrust source. Saved studies retain every assumption, including settings hidden here."
            disabled={fit.isPending || upload.isPending}
            invalidCount={
              fields.filter(
                (f) =>
                  !["mass", "track", "sigma"].includes(f.key) &&
                  (!Number.isFinite(values[f.key]) ||
                    values[f.key] < f.min ||
                    values[f.key] > f.max),
              ).length + (curveError ? 1 : 0)
            }
          >
            <div className="space-y-3">
              {fields
                .filter((f) => !["mass", "track", "sigma"].includes(f.key))
                .map((f) => (
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
                      setProtocol("custom");
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
          </AdvancedFields>
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
            onClick={async () => {
              if (!training) return;
              const thrust = curve ?? estimateThrust(DEFAULT_ESTIMATE);
              const chosen = [files.training, files.held].filter((f): f is File => !!f);
              const source_files = await Promise.all(
                chosen.map(async (file) => ({
                  label: file.name,
                  content_b64: await fileToBase64(file),
                })),
              );
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
                source_files,
              });
            }}
          >
            Calibrate
          </Button>
        </fieldset>
        <div className="min-w-0 space-y-4 p-4">
          <section aria-label="Saved calibrations" className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">Saved calibrations</h3>
              {studies.data && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {studies.data.length} stored
                </span>
              )}
            </div>
            {studies.isPending ? (
              <Skeleton className="h-16" />
            ) : studies.isError ? (
              <p role="alert" className="text-xs text-destructive">
                {studies.error.message}{" "}
                <Button size="sm" variant="link" onClick={() => void studies.refetch()}>
                  Retry
                </Button>
              </p>
            ) : !studies.data.length ? (
              <p className="text-xs text-muted-foreground">
                No calibration has been saved yet. Running one stores its inputs, results and source
                files as evidence.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border text-xs">
                {studies.data.map((study) => (
                  <li key={study.study_id} className="space-y-1 p-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(study.study_id)}
                          disabled={
                            !compareIds.includes(study.study_id) && compareIds.length >= MAX_COMPARE
                          }
                          onChange={(event) =>
                            setCompareIds((ids) =>
                              event.target.checked
                                ? [...ids, study.study_id].slice(0, MAX_COMPARE)
                                : ids.filter((id) => id !== study.study_id),
                            )
                          }
                          aria-label={`Compare calibration ${study.study_id}`}
                        />
                        Compare
                      </label>
                      <span className="tabular-nums text-muted-foreground">
                        {new Date(study.created_at).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={open.isPending || fit.isPending || upload.isPending}
                        onClick={() => open.mutate(study.study_id)}
                      >
                        {openedStudy === study.study_id ? "Reopen" : "Open"}
                      </Button>
                    </div>
                    <div className="tabular-nums">
                      {study.n_runs} runs
                      {study.n_held_out ? ` · ${study.n_held_out} held out` : ""}
                      {study.medians
                        ? ` · CdA ${(study.medians.cda_m2 * 10000).toFixed(2)} cm² · Crr ${study.medians.crr.toFixed(4)}`
                        : " · medians unavailable"}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {study.source_labels.length
                        ? study.source_labels.join(", ")
                        : "no source file stored"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {open.isError && (
              <p role="alert" className="text-xs text-destructive">
                Could not open that calibration: {open.error.message}
              </p>
            )}
            {openedStudy && (
              <p className="text-xs text-muted-foreground">
                Loaded inputs from {openedStudy}. Confirm the timing definition before
                recalculating; a new run saves a new study.
              </p>
            )}
          </section>
          {compareIds.length > 0 && (
            <section aria-label="Saved calibration comparison" className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">Compare saved calibrations</h3>
                <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                  Clear selection
                </Button>
              </div>
              <p className="text-2xs text-muted-foreground">
                {compareIds.length} of {MAX_COMPARE} selected. Details load two at a time; no fit is
                rerun. Errors come only from each study’s stored held-out rows.
              </p>
              {comparison.isPending ? (
                <Skeleton className="h-28" />
              ) : comparison.isError ? (
                <p role="alert" className="text-xs text-destructive">
                  Could not load the selected studies: {comparison.error.message}{" "}
                  <Button size="sm" variant="link" onClick={() => void comparison.refetch()}>
                    Retry
                  </Button>
                </p>
              ) : (
                <>
                  <DataTable
                    data={comparisonRows(comparison.data)}
                    columns={COMPARISON_COLUMNS}
                    label="Saved calibration comparison"
                    empty="No selected study could be loaded."
                  />
                  <p className="text-2xs leading-relaxed text-muted-foreground">
                    Studies scored on a different held-out signature are marked non-comparable and
                    are not joined into an error trend. “Not evaluated” means no held-out rows were
                    scored, not zero error. These are held-out results on the supplied data, not
                    independent physical validation.
                  </p>
                </>
              )}
            </section>
          )}
          <p className="text-sm text-muted-foreground">
            Posterior estimates depend on the supplied runs, thrust curve and priors. Timing alone
            may not identify drag and rolling separately. No physical validation is implied.
          </p>
          {[training, held]
            .filter((x): x is TimingPreview => !!x)
            .map((data) => {
              const flagged = outlierRowIndices(data.rows.length, data.outlier_indices);
              return (
                <div
                  key={`${data === training ? "training" : "held"}-${data.filename}`}
                  className="rounded-lg border p-3 text-xs"
                >
                  <h3 className="font-medium">
                    {data === training ? "Calibration" : "Held-out"} preview · {data.rows.length}{" "}
                    runs
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
                  {!data.outliersKnown && (
                    <p className="mt-1 text-muted-foreground">
                      Outlier flags are unavailable for this reconstructed saved-study preview. The
                      original file is not re-scored here, so no row is marked or removed.
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {data.rows.map((r, index) => (
                      <li key={`${index}-${r.run_no}`}>
                        Run {r.run_no}
                        {r.lane ? ` · lane ${r.lane}` : ""}: {r.time_s.toFixed(4)} s ·{" "}
                        {r.mass_kg == null ? "fallback mass" : `${(r.mass_kg * 1000).toFixed(1)} g`}
                        {r.reaction_s == null
                          ? ""
                          : ` · reaction ${r.reaction_s} s (not subtracted)`}
                        {flagged.includes(index) && (
                          <span
                            className="ml-2 rounded border border-risk/40 bg-risk/10 px-1.5 py-0.5 text-[10px] font-medium text-risk"
                            title="Flagged by the importer's median ± 5·MAD check; the row is kept and used unchanged."
                          >
                            time outlier · kept
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
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
              <PosteriorIntervals items={intervalItems} />
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
                  <HeldOutPlot
                    rows={result.held_out}
                    labels={result.held_out.map(
                      (_, index) => `run ${held?.rows[index]?.run_no ?? `row ${index + 1}`}`,
                    )}
                  />
                  {result.held_out.map((r, i) => (
                    <p key={`${i}-${r.measured_s}`} className="rounded-lg border p-3 text-xs">
                      Run {held?.rows[i]?.run_no ?? `row ${i + 1}`}: measured{" "}
                      {r.measured_s.toFixed(4)} s · predicted median {r.median_s.toFixed(4)} s · 90%
                      interval {r.p05_s.toFixed(4)}–{r.p95_s.toFixed(4)} s · error{" "}
                      {r.error_s.toFixed(4)} s
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not performed: no held-out runs were provided, so out-of-sample validation has not
                  been performed.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
