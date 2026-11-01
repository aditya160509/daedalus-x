"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TelemetryChart, type TelemetryTrack } from "@/components/charts/TelemetryChart";
import { ChannelPicker } from "@/components/race/ChannelPicker";
import { CursorTable } from "@/components/race/CursorTable";
import { GhostPanel } from "@/components/race/GhostPanel";
import { loadPresets, savePresets, type RacePreset } from "@/components/race/presets";
import { deltaTimeCurve, finishGap } from "@/components/race/raceMath";
import type { RaceTrace } from "@/components/race/useRaceCar";
import { useWhatIfSweep } from "@/components/race/whatIf";
import {
  EmptyState,
  Metric,
  Panel,
  ProvenanceBadge,
  viewerFallback,
} from "@/components/ui/primitives";
import {
  ApiError,
  designGlbUrl,
  listDesigns,
  raceMonteCarlo,
  simulateRace,
  type MonteCarlo,
  type RaceSimulation,
  type RaceSimulationRequest,
  type UncertaintyInput,
} from "@/lib/api";
import type { LoadedModel } from "@/lib/gltf";
import { loadGlbUrl } from "@/lib/gltf";
import { estimateThrust } from "@/lib/thrust";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { RaceInputs } from "./RaceInputs";
import { SpreadPanel } from "./SpreadPanel";
import {
  DEFAULT_CAR,
  DEFAULT_ESTIMATE,
  type CarParamsUi,
  type ThrustSource,
} from "./raceInputsState";

const RaceReplay = dynamic(() => import("@/components/race/RaceReplay").then((m) => m.RaceReplay), {
  ssr: false,
  loading: viewerFallback,
});

const TRACK_IDS = ["velocity", "acceleration", "forces", "distance"];
const EMPTY_TIME: number[] = [];
const DEBOUNCE_MS = 120; // spec T08: live race-time and spread update, debounced

const channelOf = (sim: RaceSimulation, name: string): number[] =>
  sim.channels.find((c) => c.name === name)?.values ?? [];

interface RaceOverrides {
  massG?: number;
  cdaCm2?: number;
  crr?: number;
  thrustScale?: number;
  model?: "M1" | "M2";
  trackM?: number;
}

export function RaceWorkspace() {
  const [model, setModel] = useState<"M1" | "M2">("M2");
  const [car, setCar] = useState<CarParamsUi>(DEFAULT_CAR);
  const [thrustScale, setThrustScale] = useState(1);
  const [source, setSource] = useState<ThrustSource>({
    kind: "estimate",
    params: DEFAULT_ESTIMATE,
  });
  const [unc, setUnc] = useState<UncertaintyInput>({
    thrust: 0.05,
    cda: 0.05,
    mass: 0.005,
    crr: 0.2,
  });
  const [cursor, setCursor] = useState(0);
  const [delta, setDelta] = useState({ a: 0, b: 0 });
  const [order, setOrder] = useState<string[]>(TRACK_IDS);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [yZoom, setYZoom] = useState<Record<string, number>>({});
  const [presets, setPresets] = useState<RacePreset[]>([]);
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const [ghostId, setGhostId] = useState<string | null>(null);
  const [ghostCdaCm2, setGhostCdaCm2] = useState(30);
  const [fileError, setFileError] = useState<string | null>(null);

  // localStorage is client-only: hydrate presets after mount so SSR never reads it.
  const presetsReady = useRef(false);
  useEffect(() => {
    if (presetsReady.current) return;
    presetsReady.current = true;
    const loaded = loadPresets();
    setPresets(loaded.presets);
    setPresetNote(loaded.error);
  }, []);

  const trace = useMemo(
    () => (source.kind === "estimate" ? estimateThrust(source.params) : source.trace),
    [source],
  );
  const thrustProvenance: "estimated" | "measured" =
    source.kind === "estimate"
      ? "estimated"
      : source.provenance === "measured"
        ? "measured"
        : "estimated";

  const buildRequest = useCallback(
    (over: RaceOverrides = {}): RaceSimulationRequest => {
      const scale = over.thrustScale ?? thrustScale;
      const massG = over.massG ?? car.massG;
      const cdaCm2 = over.cdaCm2 ?? car.cdaCm2;
      const crr = over.crr ?? car.crr;
      const mdl = over.model ?? model;
      const trackM = over.trackM ?? car.trackM;
      return {
        model: mdl,
        mass_kg: massG / 1000,
        track_length_m: trackM,
        thrust: {
          t_s: trace.t_s,
          force_n: scale === 1 ? trace.force_n : trace.force_n.map((f) => f * scale),
          provenance: thrustProvenance,
          source: source.kind === "estimate" ? "parametric estimate (Race workspace)" : source.name,
        },
        cda_m2: cdaCm2 / 10_000,
        crr,
        rho_kg_m3: car.rho,
        input_provenance: "estimated",
      };
    },
    [car, model, thrustScale, trace, thrustProvenance, source],
  );
  const sweepBuild = useCallback(
    (param: "massG" | "cdaCm2" | "crr" | "thrustScale", value: number) =>
      buildRequest({ [param]: value }),
    [buildRequest],
  );
  const { curves, running, sweep } = useWhatIfSweep(sweepBuild, unc);

  const activePreset = ghostId ? (presets.find((p) => p.id === ghostId) ?? null) : null;
  const ghostRequest: RaceSimulationRequest = activePreset
    ? buildRequest({
        massG: activePreset.massG,
        cdaCm2: activePreset.cdaCm2,
        crr: activePreset.crr,
        thrustScale: activePreset.thrustScale,
        model: activePreset.model,
      })
    : buildRequest({ cdaCm2: ghostCdaCm2 });

  const valid =
    car.massG > 1 &&
    car.massG <= 1000 &&
    car.trackM >= 1 &&
    car.trackM <= 100 &&
    car.cdaCm2 >= 0 &&
    car.cdaCm2 <= 500 &&
    car.crr >= 0 &&
    car.crr <= 1 &&
    car.rho > 0.5 &&
    car.rho < 1.5 &&
    thrustScale >= 0.05 &&
    thrustScale <= 5;

  const request = useDebouncedValue(buildRequest(), DEBOUNCE_MS);
  const debouncedGhost = useDebouncedValue(ghostRequest, DEBOUNCE_MS);

  const sim = useQuery({
    queryKey: ["race-sim", request],
    queryFn: () => simulateRace(request),
    enabled: valid,
    placeholderData: (previous) => previous,
  });
  const mc = useQuery({
    queryKey: ["race-mc", request, unc],
    queryFn: () => raceMonteCarlo(request, unc, 1000, 0, true),
    enabled: valid,
    placeholderData: (previous) => previous,
  });
  const ghost = useQuery({
    queryKey: ["race-sim-ghost", debouncedGhost],
    queryFn: () => simulateRace(debouncedGhost),
    enabled: valid,
    placeholderData: (previous) => previous,
  });

  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns, staleTime: 60_000 });
  const [design, setDesign] = useState<{ id: string; model: LoadedModel } | null>(null);
  const [designError, setDesignError] = useState<string | null>(null);
  const designId = designs.data?.[0]?.design_id ?? null;
  useEffect(() => {
    if (!designId) return undefined;
    let live = true;
    loadGlbUrl(designGlbUrl(designId), `${designId}.glb`)
      .then((loaded) => {
        if (live) setDesign({ id: designId, model: loaded });
      })
      .catch((cause) => {
        if (live) setDesignError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      live = false;
    };
  }, [designId]);

  const time = sim.data?.time_axis.values ?? EMPTY_TIME;
  const tEnd = time.length ? time[time.length - 1] : 0;
  const cursorT = tEnd > 0 ? Math.min(cursor, tEnd) : cursor;

  // Seed the delta cursors once (start and mid-run) so A/B are usable straight away.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || time.length < 2) return;
    seeded.current = true;
    setDelta({ a: time[0], b: time[Math.floor(time.length / 2)] });
  }, [time]);

  const primaryTrace: RaceTrace | null = useMemo(
    () =>
      sim.data
        ? { time: sim.data.time_axis.values, position: channelOf(sim.data, "position") }
        : null,
    [sim.data],
  );
  const ghostTrace: RaceTrace | null = useMemo(
    () =>
      ghost.data
        ? { time: ghost.data.time_axis.values, position: channelOf(ghost.data, "position") }
        : null,
    [ghost.data],
  );
  const deltaPoints = useMemo(
    () => (primaryTrace && ghostTrace ? deltaTimeCurve(primaryTrace, ghostTrace, 80) : []),
    [primaryTrace, ghostTrace],
  );
  const primaryTime = sim.data?.finished === true ? (sim.data.time_s ?? null) : null;
  const ghostTime = ghost.data?.finished === true ? (ghost.data.time_s ?? null) : null;
  const gapRaw = finishGap(primaryTime, ghostTime);
  const gapMs = gapRaw === null ? null : gapRaw * 1000;
  const gapNote = !ghost.data
    ? "waiting for ghost run"
    : primaryTime === null
      ? "primary DNF"
      : ghostTime === null
        ? "ghost DNF"
        : "—";

  const tracks = useMemo<TelemetryTrack[]>(
    () => (sim.data ? buildTracks(sim.data) : []),
    [sim.data],
  );
  const shownTracks = useMemo(
    () =>
      order
        .flatMap((id) => tracks.find((t) => t.id === id) ?? [])
        .filter((t) => visible[t.id] ?? true),
    [order, tracks, visible],
  );

  const persistPresets = (next: RacePreset[]) => {
    setPresets(next);
    setPresetNote(savePresets(next));
  };
  const addPreset = (preset: RacePreset) => {
    if (presets.some((p) => p.name.toLowerCase() === preset.name.toLowerCase())) return;
    persistPresets([...presets, preset]);
  };
  const applyPreset = (preset: RacePreset) => {
    setCar((c) => ({
      ...c,
      massG: preset.massG,
      cdaCm2: preset.cdaCm2,
      crr: preset.crr,
      rho: preset.rho,
      trackM: preset.trackM,
    }));
    setModel(preset.model);
    setThrustScale(preset.thrustScale);
  };
  const deletePreset = (id: string) => {
    persistPresets(presets.filter((p) => p.id !== id));
    if (ghostId === id) setGhostId(null);
  };

  const dragging = sim.isFetching || mc.isFetching;

  return (
    <div className="grid h-full grid-cols-[340px_1fr] gap-3 p-3">
      <RaceInputs
        model={model}
        onModel={setModel}
        car={car}
        onCar={(patch) => setCar((c) => ({ ...c, ...patch }))}
        thrustScale={thrustScale}
        onThrustScale={setThrustScale}
        source={source}
        onSource={setSource}
        onFileError={setFileError}
        curves={curves}
        running={running}
        sweep={sweep}
        thrustProvenance={thrustProvenance}
        presets={presets}
        presetNote={fileError ? `${presetNote ?? ""} ${fileError}`.trim() || null : presetNote}
        onAddPreset={addPreset}
        onRenamePreset={(id, name) =>
          persistPresets(presets.map((p) => (p.id === id ? { ...p, name } : p)))
        }
        onDeletePreset={deletePreset}
        onApplyPreset={applyPreset}
      />

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <MetricsRow sim={sim.data} mc={mc.data} error={sim.error ?? mc.error} valid={valid} />

        <div className="flex min-h-0 flex-1 gap-3">
          <Panel
            title="Telemetry · time domain"
            actions={
              <>
                {dragging && <span className="text-2xs text-muted-foreground">updating…</span>}
                <ProvenanceBadge value="predicted" />
              </>
            }
            bodyClassName="flex min-h-0 flex-1 flex-col gap-2 p-2"
            className="min-w-0 flex-1"
          >
            {sim.data ? (
              <>
                <div className="min-h-0 flex-1">
                  <TelemetryChart
                    time={time}
                    tracks={shownTracks}
                    markers={markers(sim.data, time)}
                    band={toBand(mc.data?.trajectory_band)}
                    bandTrackId="velocity"
                    yZoom={yZoom}
                    cursor={cursor}
                    delta={delta}
                    onCursor={(next) => setCursor(Math.min(next, tEnd || next))}
                    onDelta={(which, t) => setDelta((d) => ({ ...d, [which]: t }))}
                  />
                </div>
                <ChannelPicker
                  tracks={tracks}
                  order={order}
                  visible={visible}
                  yZoom={yZoom}
                  onToggle={(id) => setVisible((v) => ({ ...v, [id]: !(v[id] ?? true) }))}
                  onReorder={setOrder}
                  onZoom={(id, zoom) => setYZoom((z) => ({ ...z, [id]: zoom }))}
                />
              </>
            ) : (
              <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-surface-2" />
            )}
          </Panel>
          {sim.data && (
            <Panel title="Cursor" className="w-60 shrink-0" bodyClassName="p-0">
              <CursorTable time={time} tracks={shownTracks} cursor={cursorT} delta={delta} />
            </Panel>
          )}
        </div>

        <div className="grid h-[440px] shrink-0 grid-cols-[1.25fr_1fr] gap-3">
          <Panel
            title="Race replay"
            description="true-scale cars, camera follows the primary lane"
            actions={<ProvenanceBadge value="predicted" />}
            bodyClassName="p-0"
            className="min-h-0"
          >
            {sim.data && design && primaryTrace ? (
              <RaceReplay
                trackM={car.trackM}
                model={design.model}
                ghostModel={ghostTrace ? design.model : null}
                primary={primaryTrace}
                ghost={ghostTrace}
                cursor={cursorT}
                onCursor={setCursor}
                hasGhost={ghostTrace !== null}
              />
            ) : (
              <EmptyState
                icon={<AlertTriangle size={18} />}
                title={
                  !design
                    ? "Replay needs a design display mesh"
                    : "Replay needs a finished model run"
                }
              >
                {designError
                  ? `Could not load the display mesh: ${designError}`
                  : design
                    ? "The race model is still integrating. The replay appears with the finished telemetry."
                    : "Run the race model with a design imported in Design first; the chart and metrics still work without it."}
              </EmptyState>
            )}
          </Panel>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
            <SpreadPanel
              data={mc.data}
              error={mc.error}
              fetching={mc.isFetching}
              uncertainty={unc}
              onUncertainty={setUnc}
            />
            <GhostPanel
              presets={presets}
              selectedId={ghostId}
              onSelect={setGhostId}
              manualCdaCm2={ghostCdaCm2}
              onManualCda={setGhostCdaCm2}
              gapMs={gapMs}
              gapNote={gapNote}
              curve={deltaPoints}
              busy={ghost.isFetching}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The API names its band arrays time_s; the chart wants `time`. Null when the band is missing. */
function toBand(
  band: { time_s: number[]; p5: number[]; p50: number[]; p95: number[] } | null | undefined,
) {
  return band ? { time: band.time_s, p5: band.p5, p50: band.p50, p95: band.p95 } : null;
}

function buildTracks(sim: RaceSimulation): TelemetryTrack[] {
  return [
    {
      id: "velocity",
      name: "Velocity",
      unit: "m/s",
      color: "#22d3ee",
      series: [{ label: "velocity", values: channelOf(sim, "velocity") }],
    },
    {
      id: "acceleration",
      name: "Accel",
      unit: "m/s²",
      color: "#b18cff",
      series: [{ label: "acceleration", values: channelOf(sim, "acceleration") }],
    },
    {
      id: "forces",
      name: "Force",
      unit: "N",
      color: "#e7ebef",
      series: [
        { label: "thrust", values: channelOf(sim, "thrust"), color: "#d8b45a" },
        { label: "drag", values: channelOf(sim, "drag"), color: "#5aa8ff" },
        {
          label: "rolling",
          values: channelOf(sim, "rolling_resistance"),
          color: "#f0525a",
          dashed: true,
        },
      ],
    },
    {
      id: "distance",
      name: "Distance",
      unit: "m",
      color: "#3ccf91",
      series: [{ label: "position", values: channelOf(sim, "position") }],
    },
  ];
}

function markers(sim: RaceSimulation, time: number[]): Array<{ t: number; label: string }> {
  const out: Array<{ t: number; label: string }> = [];
  const burn = channelOf(sim, "thrust");
  const lastBurn = burn.findLastIndex((v) => v > 0);
  if (lastBurn > 0 && time[lastBurn] !== undefined) {
    out.push({ t: time[lastBurn], label: "burn end" });
  }
  if (sim.time_s !== null) out.push({ t: sim.time_s, label: "finish" });
  return out;
}

function MetricsRow({
  sim,
  mc,
  error,
  valid,
}: {
  sim?: RaceSimulation;
  mc?: MonteCarlo;
  error: Error | null;
  valid: boolean;
}) {
  if (!valid) {
    return (
      <Panel title="Prediction" className="shrink-0">
        <EmptyState icon={<AlertTriangle size={18} />} title="Inputs out of range">
          Fix the highlighted fields to run the race model.
        </EmptyState>
      </Panel>
    );
  }
  if (error) {
    return (
      <Panel title="Prediction" className="shrink-0">
        <EmptyState icon={<AlertTriangle size={18} />} title="Simulation unavailable">
          {error instanceof ApiError ? error.message : String(error)}
        </EmptyState>
      </Panel>
    );
  }
  const peakDrag = Math.max(...(sim?.channels.find((c) => c.name === "drag")?.values ?? [0]));
  const p = mc?.percentiles_s;
  return (
    <div className="grid shrink-0 grid-cols-5 gap-3">
      <Metric
        label="Travel time"
        value={sim?.finished && sim.time_s !== null ? sim.time_s.toFixed(3) : "DNF"}
        unit={sim?.finished ? "s" : undefined}
        provenance="predicted"
        tone={sim?.finished ? "default" : "danger"}
        hint={
          sim?.finished
            ? `Model ${sim.model} · inputs ${sim.input_provenance.join(", ")}`
            : (sim?.stop_reason ?? "Integrating the equations of motion.")
        }
      />
      <Metric
        label="Race-time spread"
        value={p?.p50 != null ? p.p50.toFixed(3) : "—"}
        unit={p?.p50 != null ? "s" : undefined}
        provenance="predicted"
        hint={
          p?.p50 != null
            ? `p5 ${p.p5.toFixed(3)} · p95 ${p.p95.toFixed(3)} · ${(
                (mc?.finish_fraction ?? 0) * 100
              ).toFixed(0)}% finish`
            : "1000 seeded Monte Carlo samples"
        }
      />
      <Metric
        label="Peak speed"
        value={(sim?.peak_speed_m_s ?? 0).toFixed(2)}
        unit="m/s"
        provenance="predicted"
        hint={`${((sim?.peak_speed_m_s ?? 0) * 3.6).toFixed(1)} km/h`}
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
  );
}
