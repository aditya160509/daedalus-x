"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileUp, Gauge, RotateCcw } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { TelemetryChart, type TelemetryTrack } from "@/components/charts/TelemetryChart";
import {
  Button,
  EmptyState,
  Metric,
  NumberField,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
} from "@/components/ui/primitives";
import {
  ApiError,
  type Provenance,
  type RaceSimulation,
  type RaceSimulationRequest,
  simulateRace,
} from "@/lib/api";
import {
  estimateThrust,
  impulse,
  parseThrustCsv,
  type ThrustEstimate,
  type ThrustTrace,
} from "@/lib/thrust";

/**
 * Starting assumptions, all labelled "estimated": spec §1.3 scenario values (20 m track) plus
 * order-of-magnitude car figures. They exist so the model can run before measurements arrive.
 */
const DEFAULT_CAR = { massG: 55, trackM: 20, cdaCm2: 15, crr: 0.02, rho: 1.204 };
const DEFAULT_ESTIMATE: ThrustEstimate = { peakN: 20, riseS: 0.02, decayTauS: 0.06, burnS: 0.4 };

type ThrustSource =
  | { kind: "estimate"; params: ThrustEstimate }
  | { kind: "file"; name: string; trace: ThrustTrace; provenance: Provenance };

export function RaceWorkspace() {
  const [model, setModel] = useState<"M1" | "M2">("M2");
  const [car, setCar] = useState(DEFAULT_CAR);
  const [source, setSource] = useState<ThrustSource>({
    kind: "estimate",
    params: DEFAULT_ESTIMATE,
  });
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const trace = useMemo(
    () => (source.kind === "estimate" ? estimateThrust(source.params) : source.trace),
    [source],
  );
  const thrustProvenance: Provenance = source.kind === "estimate" ? "estimated" : source.provenance;

  const request: RaceSimulationRequest = useMemo(
    () => ({
      model,
      mass_kg: car.massG / 1000,
      track_length_m: car.trackM,
      thrust: {
        ...trace,
        provenance: thrustProvenance,
        source: source.kind === "estimate" ? "parametric estimate (Race workspace)" : source.name,
      },
      cda_m2: car.cdaCm2 / 10_000,
      crr: car.crr,
      rho_kg_m3: car.rho,
      input_provenance: "estimated",
    }),
    [model, car, trace, thrustProvenance, source],
  );
  const deferred = useDeferredValue(request);
  const valid =
    car.massG > 0 &&
    car.massG <= 1000 &&
    car.trackM > 0 &&
    car.trackM <= 100 &&
    car.cdaCm2 >= 0 &&
    car.crr >= 0 &&
    car.crr <= 1 &&
    car.rho > 0.5 &&
    car.rho < 1.5;

  const sim = useQuery({
    queryKey: ["race-sim", deferred],
    queryFn: () => simulateRace(deferred),
    enabled: valid,
    placeholderData: (prev) => prev,
  });

  async function onFile(file: File) {
    setFileError(null);
    try {
      const parsed = parseThrustCsv(await file.text());
      setSource({ kind: "file", name: file.name, trace: parsed, provenance: "measured" });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Could not read file");
    }
  }

  const set = (k: keyof typeof car) => (v: number) => setCar((c) => ({ ...c, [k]: v }));
  const setEst = (k: keyof ThrustEstimate) => (v: number) =>
    setSource((s) => (s.kind === "estimate" ? { ...s, params: { ...s.params, [k]: v } } : s));

  return (
    <div className="grid h-full grid-cols-[340px_1fr] gap-3 p-3">
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <Panel title="Model" bodyClassName="p-3 space-y-3">
          <SegmentedControl
            label="Model level"
            value={model}
            onChange={setModel}
            options={[
              { value: "M1", label: "M1 · thrust only" },
              { value: "M2", label: "M2 · + drag + rolling" },
            ]}
          />
          <p className="text-2xs leading-relaxed text-muted-foreground">
            SciPy solve_ivp to the finish line. A car that stops early is a non-finish, never a
            time.
          </p>
        </Panel>

        <Panel
          title="Car inputs"
          actions={<ProvenanceBadge value="estimated" />}
          bodyClassName="p-3 space-y-2"
        >
          <NumberField
            id="mass"
            label="Mass"
            unit="g"
            value={car.massG}
            onChange={set("massG")}
            min={1}
            max={1000}
            step={0.5}
          />
          <NumberField
            id="track"
            label="Track length"
            unit="m"
            value={car.trackM}
            onChange={set("trackM")}
            min={1}
            max={100}
            step={0.5}
          />
          <NumberField
            id="cda"
            label="Drag area CdA"
            unit="cm²"
            value={car.cdaCm2}
            onChange={set("cdaCm2")}
            min={0}
            max={500}
            step={0.5}
          />
          <NumberField
            id="crr"
            label="Rolling coefficient"
            unit="—"
            value={car.crr}
            onChange={set("crr")}
            min={0}
            max={1}
            step={0.005}
          />
          <NumberField
            id="rho"
            label="Air density"
            unit="kg/m³"
            value={car.rho}
            onChange={set("rho")}
            min={0.5}
            max={1.5}
            step={0.001}
          />
          <p className="pt-1 text-2xs leading-relaxed text-muted-foreground">
            Replace with measured mass and CFD-derived CdA once available.
          </p>
        </Panel>

        <Panel
          title="Thrust"
          actions={
            <ProvenanceBadge
              value={thrustProvenance}
              title={source.kind === "file" ? source.name : "parametric assumption"}
            />
          }
          bodyClassName="p-3 space-y-2"
        >
          {source.kind === "estimate" ? (
            <>
              <NumberField
                id="peak"
                label="Peak force"
                unit="N"
                value={source.params.peakN}
                onChange={setEst("peakN")}
                min={0.1}
                max={200}
                step={0.5}
              />
              <NumberField
                id="rise"
                label="Rise time"
                unit="s"
                value={source.params.riseS}
                onChange={setEst("riseS")}
                min={0.001}
                max={0.5}
                step={0.005}
              />
              <NumberField
                id="tau"
                label="Decay constant"
                unit="s"
                value={source.params.decayTauS}
                onChange={setEst("decayTauS")}
                min={0.005}
                max={1}
                step={0.005}
              />
              <NumberField
                id="burn"
                label="Burn end"
                unit="s"
                value={source.params.burnS}
                onChange={setEst("burnS")}
                min={0.05}
                max={3}
                step={0.01}
              />
            </>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="truncate font-mono text-text">{source.name}</div>
              <div className="text-muted-foreground">
                {source.trace.t_s.length} samples · {source.trace.t_s.at(-1)?.toFixed(3)} s
              </div>
              <label className="flex items-center gap-2 pt-1 text-text-2">
                <input
                  type="checkbox"
                  className="accent-[var(--brand)]"
                  checked={source.provenance === "measured"}
                  onChange={(e) =>
                    setSource({
                      ...source,
                      provenance: e.target.checked ? "measured" : "estimated",
                    })
                  }
                />
                From a calibrated instrument
              </label>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-2 text-xs">
            <span className="text-text-2">Total impulse</span>
            <span className="tabular font-mono">{impulse(trace).toFixed(3)} N·s</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => fileInput.current?.click()}>
              <FileUp size={13} /> Import CSV
            </Button>
            {source.kind === "file" && (
              <Button
                variant="ghost"
                onClick={() => setSource({ kind: "estimate", params: DEFAULT_ESTIMATE })}
              >
                <RotateCcw size={13} /> Use estimate
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </div>
          {fileError && (
            <p role="alert" className="flex items-center gap-1.5 text-2xs text-danger">
              <AlertTriangle size={12} /> {fileError}
            </p>
          )}
          <p className="text-2xs text-muted-foreground">CSV columns: time [s], force [N].</p>
        </Panel>
      </div>

      <Results sim={sim.data} error={sim.error} loading={sim.isFetching} valid={valid} />
    </div>
  );
}

function Results({
  sim,
  error,
  loading,
  valid,
}: {
  sim?: RaceSimulation;
  error: Error | null;
  loading: boolean;
  valid: boolean;
}) {
  const tracks = useMemo<TelemetryTrack[]>(() => {
    if (!sim) return [];
    const ch = (name: string) => sim.channels.find((c) => c.name === name)?.values ?? [];
    return [
      {
        name: "Velocity",
        unit: "m/s",
        color: "#22d3ee",
        series: [{ label: "velocity", values: ch("velocity") }],
      },
      {
        name: "Accel",
        unit: "m/s²",
        color: "#b18cff",
        series: [{ label: "acceleration", values: ch("acceleration") }],
      },
      {
        name: "Force",
        unit: "N",
        color: "#e7ebef",
        series: [
          { label: "thrust", values: ch("thrust"), color: "#d8b45a" },
          { label: "drag", values: ch("drag"), color: "#5aa8ff" },
          { label: "rolling", values: ch("rolling_resistance"), color: "#f0525a", dashed: true },
        ],
      },
      {
        name: "Distance",
        unit: "m",
        color: "#3ccf91",
        series: [{ label: "position", values: ch("position") }],
      },
    ];
  }, [sim]);

  if (!valid) {
    return (
      <Panel title="Prediction">
        <EmptyState icon={<AlertTriangle size={20} />} title="Inputs out of range">
          Fix the highlighted fields to run the race model.
        </EmptyState>
      </Panel>
    );
  }
  if (!sim) {
    return (
      <Panel title="Prediction">
        {error ? (
          <EmptyState icon={<AlertTriangle size={20} />} title="Simulation unavailable">
            {error instanceof ApiError ? error.message : String(error)}
          </EmptyState>
        ) : (
          <EmptyState icon={<Gauge size={20} />} title="Running race model…">
            Integrating the equations of motion.
          </EmptyState>
        )}
      </Panel>
    );
  }

  const burnEnd = sim.channels.find((c) => c.name === "thrust");
  const tAxis = sim.time_axis.values;
  const lastThrust = burnEnd ? burnEnd.values.findLastIndex((v) => v > 0) : -1;
  const markers = [
    ...(lastThrust > 0 ? [{ t: tAxis[lastThrust], label: "burn end" }] : []),
    ...(sim.time_s !== null ? [{ t: sim.time_s, label: "finish" }] : []),
  ];
  const peakDrag = Math.max(...(sim.channels.find((c) => c.name === "drag")?.values ?? [0]));

  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="grid grid-cols-4 gap-3">
        <Metric
          label="Travel time"
          value={sim.time_s !== null ? sim.time_s.toFixed(3) : "DNF"}
          unit={sim.time_s !== null ? "s" : undefined}
          provenance="predicted"
          tone={sim.finished ? "default" : "danger"}
          hint={
            sim.finished
              ? `Model ${sim.model} · inputs ${sim.input_provenance.join(", ")}`
              : sim.stop_reason
          }
        />
        <Metric
          label="Peak speed"
          value={sim.peak_speed_m_s.toFixed(2)}
          unit="m/s"
          provenance="predicted"
          hint={`${(sim.peak_speed_m_s * 3.6).toFixed(1)} km/h`}
        />
        <Metric
          label="Peak drag"
          value={peakDrag.toFixed(3)}
          unit="N"
          provenance="predicted"
          hint="0.5 · ρ · CdA · v²"
        />
        <Metric
          label="Evidence status"
          value="Unvalidated"
          tone="risk"
          hint="No measured race run to compare against yet"
        />
      </div>
      <Panel
        title="Telemetry · time domain"
        actions={
          <>
            {loading && <span className="text-2xs text-muted-foreground">updating…</span>}
            <ProvenanceBadge value="predicted" />
          </>
        }
        bodyClassName="p-2"
      >
        <TelemetryChart time={tAxis} tracks={tracks} markers={markers} />
      </Panel>
    </div>
  );
}
