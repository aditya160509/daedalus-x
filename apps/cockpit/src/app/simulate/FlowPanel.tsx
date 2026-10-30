"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Maximize2, Minimize2, Wind } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { EmptyState, Panel, ProvenanceBadge, SegmentedControl } from "@/components/ui/primitives";
import type { CameraPreset } from "@/components/viewer/CarViewer";
import type { FlowLayers, Probe } from "@/components/viewer/FlowViewer";
import { getFlowField } from "@/lib/api";
import { type ColormapName, cssGradient } from "@/lib/colormap";
import { cn } from "@/lib/utils";

const FlowViewer = dynamic(
  () => import("@/components/viewer/FlowViewer").then((m) => m.FlowViewer),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-surface-2" /> },
);

const PRESETS: ReadonlyArray<{ value: CameraPreset; label: string }> = [
  { value: "iso", label: "Iso" },
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "top", label: "Top" },
];
const SURFACE: ReadonlyArray<{ value: FlowLayers["surface"]; label: string }> = [
  { value: "cp", label: "Cp" },
  { value: "plain", label: "Plain" },
  { value: "off", label: "Off" },
];

export function FlowPanel({ runId, hasViz }: { runId: string; hasViz: boolean }) {
  const field = useQuery({
    queryKey: ["flow-field", runId],
    queryFn: () => getFlowField(runId),
    enabled: hasViz,
    staleTime: Infinity,
  });
  const [layers, setLayers] = useState<FlowLayers>({
    surface: "cp",
    streamlines: true,
    wake: false,
    centreline: false,
    animate: true,
  });
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [max, setMax] = useState(false);
  const toggle = (k: "streamlines" | "wake" | "centreline" | "animate") => (on: boolean) =>
    setLayers((l) => ({ ...l, [k]: on }));

  const meta = field.data?.meta;
  // Diverging map centred on Cp = 0 so white always means freestream static pressure.
  const cpAbs = Math.max(...(field.data?.surface.range ?? [-1, 1]).map(Math.abs));
  const cpRange: [number, number] = [-cpAbs, cpAbs];
  const accepted = meta && meta.acceptance !== "rejected";

  return (
    <Panel
      title="Flow fields"
      description="Surface pressure, streamlines and velocity slices from the solved OpenFOAM case, mirrored to the full car."
      className={cn("lg:col-span-12", max ? "fixed inset-3 z-50 h-auto shadow-2xl" : "h-[620px]")}
      bodyClassName="relative p-0"
      actions={
        <>
          <ProvenanceBadge value="simulated" />
          <button
            type="button"
            aria-label={max ? "Exit full screen" : "Full screen"}
            onClick={() => setMax((m) => !m)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {max ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </>
      }
    >
      {!hasViz ? (
        <EmptyState icon={<Wind />} title="No flow-field export">
          Run <code className="font-mono">daedalus cfd viz data/runs/{runId}</code> to export
          pressure, streamlines and slices.
        </EmptyState>
      ) : field.isError ? (
        <EmptyState icon={<AlertTriangle />} title="Could not load flow fields">
          {field.error.message}
        </EmptyState>
      ) : !field.data ? (
        <div className="h-full animate-pulse bg-surface-2" />
      ) : (
        <>
          <FlowViewer
            field={field.data}
            layers={layers}
            cpRange={cpRange}
            preset={preset}
            presetNonce={nonce}
            onProbe={setProbe}
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border bg-card/85 p-1.5 backdrop-blur">
              <span className="px-1.5 text-xs text-muted-foreground">Surface</span>
              <SegmentedControl
                label="Surface colouring"
                options={SURFACE}
                value={layers.surface}
                onChange={(surface) => setLayers((l) => ({ ...l, surface }))}
              />
              <span className="mx-1 h-5 w-px bg-border" />
              {(
                [
                  ["streamlines", "Streamlines"],
                  ["animate", "Animate"],
                  ["wake", "Wake slice"],
                  ["centreline", "Centreline"],
                ] as const
              ).map(([k, label]) => (
                <Toggle
                  key={k}
                  size="sm"
                  variant="outline"
                  pressed={layers[k]}
                  onPressedChange={toggle(k)}
                  disabled={k === "animate" && !layers.streamlines}
                  className="h-7 px-2.5 text-xs data-[state=on]:border-brand/50 data-[state=on]:bg-brand/10"
                >
                  {label}
                </Toggle>
              ))}
            </div>
            <div className="pointer-events-auto ml-auto rounded-lg border bg-card/85 p-1.5 backdrop-blur">
              <SegmentedControl
                label="Camera"
                options={PRESETS}
                value={preset}
                onChange={(p) => {
                  setPreset(p);
                  setNonce((n) => n + 1);
                }}
              />
            </div>
          </div>

          {!accepted && meta && (
            <div className="absolute top-16 left-3 flex max-w-md items-start gap-2 rounded-lg border border-danger/40 bg-card/90 px-3 py-2 text-xs backdrop-blur">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
              <span className="text-text-2">
                Fields from a <b className="text-danger">rejected</b> run. Use them to see the flow,
                not to quote numbers.
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute right-3 bottom-3 flex flex-col items-end gap-2">
            {probe && (
              <div className="rounded-lg border bg-card/90 px-3 py-2 text-xs backdrop-blur">
                <span className="text-muted-foreground">{probe.layer} · </span>
                <span className="tabular font-medium">
                  {probe.name} = {probe.value.toFixed(3)}
                </span>
              </div>
            )}
            {layers.surface === "cp" && (
              <Legend title="Surface Cp" map="coolwarm" range={cpRange} />
            )}
            {(layers.streamlines || layers.wake || layers.centreline) && (
              <Legend
                title="Velocity / U∞"
                map="turbo"
                range={
                  layers.wake || layers.centreline
                    ? field.data.wake.range
                    : field.data.streamlines.range
                }
              />
            )}
          </div>
          <p className="absolute bottom-3 left-24 text-[11px] text-muted-foreground">
            U∞ {meta?.U_m_s} m/s · iteration {meta?.iterations ?? "—"} · drag to orbit, scroll to
            zoom, hover to probe
          </p>
        </>
      )}
    </Panel>
  );
}

function Legend({
  title,
  map,
  range,
}: {
  title: string;
  map: ColormapName;
  range: readonly [number, number];
}) {
  const [lo, hi] = range;
  return (
    <div className="w-56 rounded-lg border bg-card/90 px-3 py-2 backdrop-blur">
      <div className="mb-1.5 text-[11px] text-muted-foreground">{title}</div>
      <div className="h-2 rounded-full" style={{ background: cssGradient(map) }} />
      <div className="tabular mt-1 flex justify-between text-[11px] text-text-2">
        <span>{lo.toFixed(2)}</span>
        <span>{((lo + hi) / 2).toFixed(2)}</span>
        <span>{hi.toFixed(2)}</span>
      </div>
    </div>
  );
}
