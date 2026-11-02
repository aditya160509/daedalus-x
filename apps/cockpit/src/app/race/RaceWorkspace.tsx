"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TelemetryChart, type TelemetryTrack } from "@/components/charts/TelemetryChart";
import { ChannelPicker } from "@/components/race/ChannelPicker";
import { CursorTable } from "@/components/race/CursorTable";
import { GhostPanel } from "@/components/race/GhostPanel";
import { ReactionTrainer } from "@/components/race/ReactionTrainer";
import { TimingTower } from "@/components/race/TimingTower";
import { loadPresets, savePresets, type RacePreset } from "@/components/race/presets";
import { deltaTimeCurve, finishGap } from "@/components/race/raceMath";
import type { RaceTrace } from "@/components/race/useRaceCar";
import { useWhatIfSweep } from "@/components/race/whatIf";
import { EmptyState, Panel, ProvenanceBadge, ViewerFallback } from "@/components/ui/primitives";
import {
  designGlbUrl,
  listDesigns,
  raceMonteCarlo,
  simulateRace,
  getEnergyAudit,
  getRaceBreakdown,
  type RaceSimulationRequest,
  type UncertaintyInput,
} from "@/lib/api";
import { loadGlbUrl } from "@/lib/gltf";
import { estimateThrust } from "@/lib/thrust";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { RaceInputs } from "./RaceInputs";
import { StatusBar, useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";

const RACE_TABS = [
  { id: "replay", label: "Replay" },
  { id: "telemetry", label: "Telemetry" },
  { id: "spread", label: "Spread" },
  { id: "start", label: "Start" },
  { id: "energy", label: "Energy" },
  { id: "breakdown", label: "Breakdown" },
  { id: "calibration", label: "Calibration" },
] as const;
import { SpreadPanel } from "./SpreadPanel";
import { EnergyPanel } from "@/components/race/EnergyPanel";
import { BreakdownPanel } from "@/components/race/BreakdownPanel";
import { CalibrationPanel } from "@/components/race/CalibrationPanel";
import {
  DEFAULT_CAR,
  DEFAULT_ESTIMATE,
  type CarParamsUi,
  type ThrustSource,
} from "./raceInputsState";
import { MetricsRow } from "./MetricsRow";
import { buildTracks, channelOf, markers, toBand } from "./raceTracks";

const RaceReplay = dynamic(() => import("@/components/race/RaceReplay").then((m) => m.RaceReplay), {
  ssr: false,
  loading: ViewerFallback,
});

const TRACK_IDS = ["velocity", "acceleration", "forces", "distance"];
const EMPTY_TIME: number[] = [];
const DEBOUNCE_MS = 120; // spec T08: live race-time and spread update, debounced

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
  const [playhead, setPlayhead] = useState({ key: "", time: 0 });
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
  const requestKey = JSON.stringify(request);
  const cursor = playhead.key === requestKey ? playhead.time : 0;
  const setCursor = useCallback(
    (time: number) => setPlayhead({ key: requestKey, time }),
    [requestKey],
  );
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
  const [pickedDesign, setPickedDesign] = useState("");
  const [ghostGeometry, setGhostGeometry] = useState("");
  const designId = pickedDesign || designs.data?.[0]?.design_id;
  const primaryModel = useQuery({
    queryKey: ["replay-model", designId],
    enabled: !!designId,
    queryFn: () => loadGlbUrl(designGlbUrl(designId!), `${designId}.glb`),
    staleTime: Infinity,
  });
  const comparisonModel = useQuery({
    queryKey: ["replay-model", ghostGeometry],
    enabled: !!ghostGeometry,
    queryFn: () => loadGlbUrl(designGlbUrl(ghostGeometry), `${ghostGeometry}.glb`),
    staleTime: Infinity,
  });
  const design = primaryModel.data ? { id: designId!, model: primaryModel.data } : null;
  const designError = primaryModel.error?.message ?? designs.error?.message;

  const time = sim.data?.time_axis.values ?? EMPTY_TIME;
  const tEnd = time.length ? time[time.length - 1] : 0;
  const cursorT = tEnd > 0 ? Math.min(cursor, tEnd) : cursor;

  // Seed the delta cursors once (start and mid-run) so A/B are usable straight away.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || time.length < 2) return;
    seeded.current = true;
    setDelta({ a: time[0], b: (time[0] + time[time.length - 1]) / 2 });
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
  // Keep chart inputs stable while the shared cursor moves; recreating native charts
  // on every animation frame generates avoidable canvas/heap churn.
  const eventMarkers = useMemo(() => (sim.data ? markers(sim.data, time) : []), [sim.data, time]);
  const trajectoryBand = useMemo(
    () => toBand(mc.data?.trajectory_band),
    [mc.data?.trajectory_band],
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
  const [tab, setTab] = useTab(RACE_TABS);
  const energy = useQuery({
    queryKey: ["race-energy", request],
    queryFn: () => getEnergyAudit(request),
    enabled: valid && tab === "energy",
  });
  const breakdown = useQuery({
    queryKey: ["race-breakdown", request],
    queryFn: () => getRaceBreakdown(request, 0),
    enabled: valid && tab === "breakdown",
  });
  const [inputsOpen, setInputsOpen] = useState(false);

  const p = mc.data?.percentiles_s;
  const status = [
    {
      label: "Time",
      value:
        sim.data?.finished && sim.data.time_s != null ? `${sim.data.time_s.toFixed(3)} s` : "DNF",
    },
    { label: "p5–p95", value: p?.p50 != null ? `${p.p5.toFixed(3)}–${p.p95.toFixed(3)} s` : "—" },
    { label: "Peak", value: `${(sim.data?.peak_speed_m_s ?? 0).toFixed(2)} m/s` },
    {
      label: "Ghost gap",
      value: gapMs != null ? `${gapMs > 0 ? "+" : ""}${gapMs.toFixed(0)} ms` : "—",
    },
    { label: "Evidence", value: "unvalidated", tone: "risk" as const },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {inputsOpen && (
        <div className="max-h-[35vh] w-full shrink-0 overflow-y-auto border-b p-3 md:max-h-none md:w-[300px] md:border-r md:border-b-0">
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
              persistPresets(presets.map((item) => (item.id === id ? { ...item, name } : item)))
            }
            onDeletePreset={deletePreset}
            onApplyPreset={applyPreset}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTabs
          tabs={RACE_TABS}
          value={tab}
          onChange={setTab}
          right={
            <>
              {dragging && <span className="text-2xs text-muted-foreground">updating…</span>}
              <select
                aria-label="Replay car design"
                value={designId ?? ""}
                onChange={(event) => setPickedDesign(event.target.value)}
                className="h-7 max-w-36 min-w-0 rounded-md border bg-background px-1.5 text-xs"
              >
                {designs.data?.map((item) => (
                  <option key={item.design_id} value={item.design_id}>
                    {item.design_id}
                  </option>
                ))}
              </select>
              <Button size="xs" variant="ghost" onClick={() => setInputsOpen((value) => !value)}>
                {inputsOpen ? "Hide inputs" : "Show inputs"}
              </Button>
            </>
          }
        />
        {(!valid || sim.error || mc.error) && (
          <div className="p-3">
            <MetricsRow sim={sim.data} mc={mc.data} error={sim.error ?? mc.error} valid={valid} />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 xl:flex-row">
          {tab === "replay" && (
            <>
              <div className="min-h-[600px] min-w-0 flex-1 md:min-h-[440px] xl:min-h-0 [&>section]:h-full">
                <Panel
                  title="Race replay"
                  description="Source CAD at true scale · race-model trajectories"
                  actions={<ProvenanceBadge value="predicted" />}
                  bodyClassName="p-0"
                  className="min-h-0"
                >
                  {sim.data && design && primaryTrace ? (
                    <RaceReplay
                      key={design.id + requestKey}
                      trackM={car.trackM}
                      model={design.model}
                      ghostModel={ghostGeometry ? (comparisonModel.data ?? null) : design.model}
                      primary={primaryTrace}
                      ghost={ghostTrace}
                      // Unclamped so a slower ghost is shown crossing the line; the telemetry
                      // readouts clamp to the primary trace themselves.
                      cursor={cursor}
                      onCursor={setCursor}
                      hasGhost={ghostTrace !== null}
                      primaryName={design.id}
                      comparisonName={activePreset?.name ?? "Manual CdA"}
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
              </div>
              <div className="flex w-full shrink-0 flex-col gap-3 xl:w-72 xl:overflow-y-auto">
                {primaryTrace && (
                  <TimingTower
                    primary={primaryTrace}
                    ghost={ghostTrace}
                    lengthM={car.trackM}
                    primaryTime={primaryTime}
                    cursor={cursor}
                    primaryName={designId}
                    ghostName={activePreset?.name ?? "Manual CdA"}
                    ghostTime={ghost.data?.finished === true ? (ghost.data.time_s ?? null) : null}
                  />
                )}
                <details className="rounded-lg border bg-card p-3" open>
                  <summary className="cursor-pointer text-xs font-medium">
                    Compare configurations
                  </summary>
                  <label className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    Comparison geometry
                    <select
                      value={ghostGeometry}
                      onChange={(event) => setGhostGeometry(event.target.value)}
                      className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="">Same design</option>
                      {designs.data?.map((item) => (
                        <option key={item.design_id} value={item.design_id}>
                          {item.design_id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="my-2 text-[10px] text-muted-foreground">
                    Geometry selection changes the display. Motion uses the configuration below.
                  </p>
                  {comparisonModel.error && (
                    <p role="alert" className="text-xs text-destructive">
                      {comparisonModel.error.message}
                    </p>
                  )}
                  <div className="min-h-64 [&>section]:h-full">
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
                </details>
              </div>
            </>
          )}
          {tab === "telemetry" && (
            <>
              <Panel
                title="Telemetry · time domain"
                actions={
                  <>
                    {dragging && <span className="text-2xs text-muted-foreground">updating…</span>}
                    <ProvenanceBadge value="predicted" />
                  </>
                }
                bodyClassName="flex min-h-0 flex-1 flex-col gap-2 p-2"
                className="min-h-[580px] min-w-0 flex-1 xl:min-h-0"
              >
                {sim.data ? (
                  <>
                    <div className="min-h-0 flex-1">
                      <TelemetryChart
                        time={time}
                        tracks={shownTracks}
                        markers={eventMarkers}
                        band={trajectoryBand}
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
                <Panel
                  title="Cursor"
                  className="w-full shrink-0 xl:w-80"
                  bodyClassName="overflow-x-auto p-0"
                >
                  <CursorTable time={time} tracks={shownTracks} cursor={cursorT} delta={delta} />
                </Panel>
              )}
            </>
          )}
          {tab === "spread" && (
            <div className="mx-auto w-full max-w-4xl overflow-y-auto">
              <SpreadPanel
                data={mc.data}
                error={mc.error}
                fetching={mc.isFetching}
                uncertainty={unc}
                onUncertainty={setUnc}
              />
            </div>
          )}
          {tab === "energy" && (
            <div className="mx-auto w-full max-w-4xl overflow-y-auto">
              <EnergyPanel data={energy.data} error={energy.error} fetching={energy.isFetching} />
            </div>
          )}
          {tab === "calibration" && (
            <div className="mx-auto h-full max-w-5xl p-3 [&>section]:h-full">
              <CalibrationPanel />
            </div>
          )}
          {tab === "breakdown" && (
            <div className="mx-auto w-full max-w-4xl overflow-y-auto">
              <BreakdownPanel data={breakdown.data} error={breakdown.error} />
            </div>
          )}
          {tab === "start" && (
            <div className="mx-auto mt-10 w-full max-w-md">
              <ReactionTrainer />
            </div>
          )}
        </div>
        <StatusBar items={status} />
      </div>
    </div>
  );
}
