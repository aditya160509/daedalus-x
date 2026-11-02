"use client";

// ParaView-style live flow viewer built on vtk.js (BSD-3, Kitware; credited in THIRD_PARTY.md).
// Layers are VTK XML files the API exports per run: /v1/cfd/runs/{id}/vtk/{layer}.
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import vtkXMLImageDataReader from "@kitware/vtk.js/IO/XML/XMLImageDataReader";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkColorMaps from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import type vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const PRESETS = ["Cool to Warm", "jet", "Viridis (matplotlib)", "Inferno (matplotlib)"] as const;
// Array names as exported (ASCII: vtk.js does not match non-ASCII names) -> label, range.
const FIELDS = {
  U_Uinf: ["U/U∞", [0, 1.25]],
  Ux_Uinf: ["Ux/U∞", [-0.2, 1.2]],
  Cp: ["Cp", [-1, 1]],
} as const satisfies Record<string, readonly [string, readonly [number, number]]>;
type Field = keyof typeof FIELDS;
const isField = (v: string): v is Field => v in FIELDS;
const isPreset = (v: string): v is (typeof PRESETS)[number] =>
  (PRESETS as readonly string[]).includes(v);
const AXES = ["x", "y", "z"] as const;
type Axis = (typeof AXES)[number];

interface LayerStyle {
  visible: boolean;
  preset: (typeof PRESETS)[number];
}
interface Layers {
  surface: LayerStyle;
  streamlines: LayerStyle;
  slice: LayerStyle & { field: Field; axis: Axis; pos: number };
}

const INITIAL: Layers = {
  surface: { visible: true, preset: "Cool to Warm" },
  streamlines: { visible: true, preset: "jet" },
  slice: { visible: true, preset: "jet", field: "U_Uinf", axis: "y", pos: 0.5 },
};

const CompareSource = z.object({
  run_id: z.string(),
  geometry_sha256: z.string(),
  speed_m_s: z.number(),
  field_time: z.string(),
  acceptance: z.string(),
  provenance: z.literal("simulated"),
});
const CompareMetadata = z.object({
  base: CompareSource,
  other: CompareSource,
  coordinate_frame: z.string(),
  definition: z.string(),
  method: z.string(),
});
type CompareMetadata = z.infer<typeof CompareMetadata>;

async function compareRequest(url: string, signal: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
        ? body.detail
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return response;
}

function lut(preset: string, [lo, hi]: readonly [number, number]) {
  const f = vtkColorTransferFunction.newInstance();
  f.applyColorMap(vtkColorMaps.getPresetByName(preset));
  f.setMappingRange(lo, hi);
  f.updateRange();
  return f;
}

/** CSS gradient sampled from a vtk.js preset, for the HTML legend. */
function gradient(preset: string) {
  const f = lut(preset, [0, 1]);
  const rgb = [0, 0, 0];
  const stops = Array.from({ length: 16 }, (_, i) => {
    f.getColor(i / 15, rgb);
    return `rgb(${rgb.map((c) => Math.round(c * 255)).join(",")}) ${((i / 15) * 100).toFixed(0)}%`;
  });
  f.delete();
  return `linear-gradient(to right, ${stops.join(",")})`;
}

async function fetchLayer(runId: string, file: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(`/api/v1/cfd/runs/${encodeURIComponent(runId)}/vtk/${file}`, {
    cache: "no-cache", // revalidate: layers are rebuilt when a run is re-solved
    signal,
  });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  return res.arrayBuffer();
}

export function FlowViewer3D({
  runId,
  acceptance,
  speed,
  length,
  runs,
}: {
  runId: string;
  acceptance: string;
  speed: number;
  length: number;
  runs: { run_id: string; state: string }[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{
    render: () => void;
    reset: () => void;
    surface: vtkActor;
    lines: vtkActor;
    slice: vtkImageSlice;
    image: vtkImageData;
    lookups: {
      surface: ReturnType<typeof lut> | null;
      lines: ReturnType<typeof lut> | null;
      slice: ReturnType<typeof lut> | null;
    };
    addInsight: (
      buffer: ArrayBuffer,
      array: string,
      preset: string,
      range: readonly [number, number],
    ) => (() => void) | null;
  } | null>(null);
  const [layers, setLayers] = useState<Layers>(INITIAL);
  const [status, setStatus] = useState<string>("loading");
  const [wake, setWake] = useState("off");
  const [vortex, setVortex] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("");
  const [vortexStatus, setVortexStatus] = useState("");
  const [otherRun, setOtherRun] = useState("");
  const [comparison, setComparison] = useState<{ metadata: CompareMetadata; range: number } | null>(
    null,
  );
  const [compareStatus, setCompareStatus] = useState("");

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");
    const grw = vtkGenericRenderWindow.newInstance({ background: [0.043, 0.047, 0.059] });
    grw.setContainer(host.current);
    grw.resize();
    const renderer = grw.getRenderer();
    const win = grw.getRenderWindow();
    const insightDisposers = new Set<() => void>();
    const graphics: Array<() => void> = [];
    const dataObjects: Array<() => void> = [];
    const readers: Array<() => void> = [];
    const lookups: {
      surface: ReturnType<typeof lut> | null;
      lines: ReturnType<typeof lut> | null;
      slice: ReturnType<typeof lut> | null;
    } = { surface: null, lines: null, slice: null };
    let disposed = false;
    const disposeBase = () => {
      if (disposed) return;
      disposed = true;
      graphics.reverse().forEach((dispose) => dispose());
      Object.values(lookups).forEach((lookup) => lookup?.delete());
      dataObjects.reverse().forEach((dispose) => dispose());
      readers.reverse().forEach((dispose) => dispose());
    };
    const observer = new ResizeObserver(() => grw.resize());
    observer.observe(host.current);

    (async () => {
      const [s, l, v] = await Promise.all(
        ["surface.vtp", "streamlines.vtp", "volume.vti"].map((f) =>
          fetchLayer(runId, f, controller.signal),
        ),
      );
      if (cancelled) return;
      const poly = (buf: ArrayBuffer) => {
        const r = vtkXMLPolyDataReader.newInstance();
        readers.push(() => r.delete());
        r.parseAsArrayBuffer(buf);
        const data = r.getOutputData(0);
        dataObjects.push(() => data.delete());
        return data;
      };
      const imgReader = vtkXMLImageDataReader.newInstance();
      readers.push(() => imgReader.delete());
      imgReader.parseAsArrayBuffer(v);
      const image = imgReader.getOutputData(0) as vtkImageData;
      dataObjects.push(() => image.delete());

      const colored = (data: ReturnType<typeof poly>, array: string, base = true) => {
        const mapper = vtkMapper.newInstance({
          scalarVisibility: true,
          useLookupTableScalarRange: true,
        });
        if (base) graphics.push(() => mapper.delete());
        mapper.setScalarModeToUsePointFieldData();
        mapper.setColorByArrayName(array);
        mapper.setInputData(data);
        const actor = vtkActor.newInstance();
        if (base)
          graphics.push(() => {
            renderer.removeActor(actor);
            actor.delete();
          });
        actor.setMapper(mapper);
        renderer.addActor(actor);
        return actor;
      };
      const surface = colored(poly(s), "Cp");
      surface.getProperty().setSpecular(0.3);
      const lines = colored(poly(l), "U_Uinf");
      lines.getProperty().setLineWidth(1.5);

      const sliceMapper = vtkImageMapper.newInstance();
      graphics.push(() => sliceMapper.delete());
      sliceMapper.setInputData(image);
      const slice = vtkImageSlice.newInstance();
      graphics.push(() => {
        renderer.removeViewProp(slice);
        slice.delete();
      });
      slice.setMapper(sliceMapper);
      slice.getProperty().setUseLookupTableScalarRange(true);
      slice.getProperty().setOpacity(0.85);
      renderer.addViewProp(slice);

      const camera = renderer.getActiveCamera();
      const reset = () => {
        camera.setPosition(-0.16, -0.21, 0.13);
        camera.setFocalPoint(0.11, 0, 0.02);
        camera.setViewUp(0, 0, 1);
        renderer.resetCamera();
        camera.zoom(1.6);
        win.render();
      };
      const addInsight = (
        buffer: ArrayBuffer,
        array: string,
        preset: string,
        range: readonly [number, number],
      ) => {
        const reader = vtkXMLPolyDataReader.newInstance();
        try {
          reader.parseAsArrayBuffer(buffer);
        } catch (error) {
          reader.delete();
          throw error;
        }
        const data = reader.getOutputData(0);
        if (!data.getNumberOfPoints()) {
          data.delete();
          reader.delete();
          return null;
        }
        const actor = colored(data, array, false);
        const mapper = actor.getMapper()!;
        const lookup = lut(preset, range);
        mapper.setLookupTable(lookup);
        actor.getProperty().setOpacity(0.8);
        win.render();
        const dispose = () => {
          if (!insightDisposers.delete(dispose)) return;
          renderer.removeActor(actor);
          actor.delete();
          mapper.delete();
          lookup.delete();
          data.delete();
          reader.delete();
          win.render();
        };
        insightDisposers.add(dispose);
        return dispose;
      };
      scene.current = {
        render: () => win.render(),
        reset,
        surface,
        lines,
        slice,
        image,
        lookups,
        addInsight,
      };
      reset();
      setStatus("ready");
    })().catch((err: unknown) => {
      if (!cancelled) {
        disposeBase();
        setStatus(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      observer.disconnect();
      insightDisposers.forEach((dispose) => dispose());
      scene.current = null;
      disposeBase();
      grw.delete();
    };
  }, [runId]);

  // Apply layer styles whenever they (or the scene) change.
  useEffect(() => {
    const sc = scene.current;
    if (!sc || status !== "ready") return;
    sc.surface.setVisibility(layers.surface.visible && !comparison);
    const surfaceLut = lut(layers.surface.preset, FIELDS.Cp[1]);
    sc.surface.getMapper()!.setLookupTable(surfaceLut);
    sc.lookups.surface?.delete();
    sc.lookups.surface = surfaceLut;
    sc.lines.setVisibility(layers.streamlines.visible);
    const linesLut = lut(layers.streamlines.preset, FIELDS.U_Uinf[1]);
    sc.lines.getMapper()!.setLookupTable(linesLut);
    sc.lookups.lines?.delete();
    sc.lookups.lines = linesLut;

    const { field, axis, pos, preset, visible } = layers.slice;
    sc.image.getPointData().setActiveScalars(field);
    const mapper = sc.slice.getMapper() as vtkImageMapper;
    const dims = sc.image.getDimensions();
    const i = AXES.indexOf(axis);
    mapper.setSlicingMode(
      [vtkImageMapper.SlicingMode.I, vtkImageMapper.SlicingMode.J, vtkImageMapper.SlicingMode.K][i],
    );
    mapper.setSlice(Math.round(pos * (dims[i] - 1)));
    const sliceLut = lut(preset, FIELDS[field][1]);
    sc.slice.getProperty().setRGBTransferFunction(0, sliceLut);
    sc.lookups.slice?.delete();
    sc.lookups.slice = sliceLut;
    sc.slice.setVisibility(visible);
    sc.render();
  }, [layers, status, comparison]);

  useEffect(() => {
    const sc = scene.current;
    if (!sc || status !== "ready" || !otherRun || otherRun === runId) {
      setCompareStatus("");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let remove: (() => void) | null = null;
    const params = new URLSearchParams({ base: runId, other: otherRun });
    setCompareStatus("Checking sources and building comparison…");
    (async () => {
      const metadata = CompareMetadata.parse(
        await (
          await compareRequest(`/api/v1/cfd/compare/cp/metadata?${params}`, controller.signal)
        ).json(),
      );
      const response = await compareRequest(
        `/api/v1/cfd/compare/cp/surface.vtp?${params}`,
        controller.signal,
      );
      if (
        response.headers.get("X-Base-Time") !== metadata.base.field_time ||
        response.headers.get("X-Other-Time") !== metadata.other.field_time ||
        response.headers.get("X-Geometry-Sha256") !== metadata.base.geometry_sha256
      )
        throw new Error("Source changed while comparing; retry the selection");
      const maximumHeader = response.headers.get("X-Delta-Cp-Max");
      if (maximumHeader === null) throw new Error("Comparison colour range missing");
      const maximum = Number(maximumHeader);
      if (!Number.isFinite(maximum) || maximum < 0)
        throw new Error("Invalid comparison colour range");
      const buffer = await response.arrayBuffer();
      if (cancelled) return;
      const range = Math.max(maximum, 0.001);
      remove = sc.addInsight(buffer, "DeltaCp", "Cool to Warm", [-range, range]);
      if (!remove) throw new Error("No comparable surface points returned");
      setComparison({ metadata, range });
      setCompareStatus("");
    })().catch((error: unknown) => {
      if (!cancelled)
        setCompareStatus(
          `Comparison unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
    });
    return () => {
      cancelled = true;
      controller.abort();
      if (scene.current === sc) remove?.();
    };
  }, [runId, otherRun, status]);

  useEffect(() => {
    const sc = scene.current;
    if (!sc || status !== "ready" || wake === "off") {
      setWakeStatus("");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let remove: (() => void) | null = null;
    setWakeStatus("Loading wake plane…");
    fetchLayer(runId, `${wake}.vtp`, controller.signal)
      .then((buffer) => {
        if (cancelled) return;
        remove = sc.addInsight(buffer, "Ux_Uinf", "jet", FIELDS.Ux_Uinf[1]);
        setWakeStatus(
          remove ? "" : "No field intersects this plane within the displayed wake region.",
        );
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setWakeStatus(
            `Wake plane unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
      });
    return () => {
      cancelled = true;
      controller.abort();
      if (scene.current === sc) remove?.();
    };
  }, [runId, status, wake]);

  useEffect(() => {
    const sc = scene.current;
    if (!sc || status !== "ready" || !vortex) {
      setVortexStatus("");
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    let remove: (() => void) | null = null;
    setVortexStatus("Loading Q surfaces…");
    fetchLayer(runId, "vortex.vtp", controller.signal)
      .then((buffer) => {
        if (cancelled) return;
        remove = sc.addInsight(buffer, "U_Uinf", "jet", FIELDS.U_Uinf[1]);
        setVortexStatus(remove ? "" : "No Q isosurface at the selected levels.");
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setVortexStatus(
            `Q surfaces unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
      });
    return () => {
      cancelled = true;
      controller.abort();
      if (scene.current === sc) remove?.();
    };
  }, [runId, status, vortex]);

  const set = <K extends keyof Layers>(k: K, patch: Partial<Layers[K]>) =>
    setLayers((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto md:flex-row">
      <div className="relative min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-lg border">
        <div ref={host} className="absolute inset-0" />
        {status !== "ready" && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            {status === "loading" ? "Loading flow field…" : `Could not load: ${status}`}
          </div>
        )}
        <button
          type="button"
          onClick={() => scene.current?.reset()}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Reset view
        </button>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto text-xs md:w-64">
        <p className="text-muted-foreground">
          Run {runId} · simulated · acceptance: {acceptance.replaceAll("_", " ")} · U∞ {speed} m/s ·
          L {length} m
        </p>
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
          Pipeline
        </p>
        <section className="space-y-2 rounded-lg border p-2.5">
          <label htmlFor="compare-run" className="font-medium">
            Compare surface ΔCp [1]
          </label>
          <p className="text-muted-foreground">
            Base: {runId} (choose in the global run selector). Select the other run below.
          </p>
          <select
            id="compare-run"
            value={otherRun}
            onChange={(event) => {
              setComparison(null);
              setOtherRun(event.target.value);
            }}
            className="w-full rounded border bg-transparent px-1 py-0.5"
          >
            <option value="">Off</option>
            {runs
              .filter((run) => run.run_id !== runId && run.state === "succeeded")
              .map((run) => (
                <option key={run.run_id} value={run.run_id}>
                  {run.run_id}
                </option>
              ))}
          </select>
          {runs.filter((run) => run.run_id !== runId && run.state === "succeeded").length === 0 && (
            <p className="text-muted-foreground">No other completed run is available.</p>
          )}
          {compareStatus && <p role="status">{compareStatus}</p>}
          {comparison && (
            <>
              <p>
                ΔCp = Cp({comparison.metadata.other.run_id}) − Cp({comparison.metadata.base.run_id})
                [1]
              </p>
              <div className="h-2 rounded-sm" style={{ background: gradient("Cool to Warm") }} />
              <p className="flex justify-between font-mono text-muted-foreground">
                <span>−{comparison.range.toFixed(4)}</span>
                <span>0</span>
                <span>+{comparison.range.toFixed(4)}</span>
              </p>
              {[comparison.metadata.base, comparison.metadata.other].map((source) => (
                <p key={source.run_id} className="text-muted-foreground">
                  {source.run_id} · {source.provenance} · acceptance:{" "}
                  {source.acceptance.replaceAll("_", " ")} · U∞ {source.speed_m_s} m/s · field{" "}
                  {source.field_time}
                </p>
              ))}
              <p className="break-all text-muted-foreground">
                STL source SHA-256: {comparison.metadata.base.geometry_sha256}
              </p>
              <p className="text-muted-foreground">
                {comparison.metadata.coordinate_frame}. Identical indexed surface; no interpolation.
                Each Cp uses its own inlet speed and the same kinematic-pressure reference.
              </p>
              <a
                className="underline"
                href={`/api/v1/cfd/compare/cp/surface.vtp?${new URLSearchParams({ base: runId, other: otherRun })}`}
                download
              >
                Download ΔCp VTP
              </a>
              {" · "}
              <a
                className="underline"
                href={`/api/v1/cfd/compare/cp/metadata?${new URLSearchParams({ base: runId, other: otherRun })}`}
                download
              >
                Download source metadata
              </a>
            </>
          )}
        </section>
        <LayerCard
          title="Car surface · Cp"
          style={layers.surface}
          range={FIELDS.Cp[1]}
          onToggle={() => set("surface", { visible: !layers.surface.visible })}
          onPreset={(p) => set("surface", { preset: p })}
        />
        <LayerCard
          title="Streamlines · U/U∞"
          style={layers.streamlines}
          range={FIELDS.U_Uinf[1]}
          onToggle={() => set("streamlines", { visible: !layers.streamlines.visible })}
          onPreset={(p) => set("streamlines", { preset: p })}
        />
        <LayerCard
          title="Slice"
          style={layers.slice}
          range={FIELDS[layers.slice.field][1]}
          onToggle={() => set("slice", { visible: !layers.slice.visible })}
          onPreset={(p) => set("slice", { preset: p })}
        >
          <label className="flex items-center justify-between gap-2">
            Field
            <select
              value={layers.slice.field}
              onChange={(e) => {
                const v = e.target.value;
                if (isField(v)) set("slice", { field: v });
              }}
              className="rounded border bg-transparent px-1 py-0.5"
            >
              {Object.entries(FIELDS).map(([id, [label]]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1" role="radiogroup" aria-label="Slice normal">
            {AXES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={layers.slice.axis === a}
                onClick={() => set("slice", { axis: a })}
                className={cn(
                  "flex-1 rounded border py-0.5 font-mono uppercase",
                  layers.slice.axis === a
                    ? "bg-foreground text-background"
                    : "text-muted-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layers.slice.pos}
            onChange={(e) => set("slice", { pos: Number(e.target.value) })}
            aria-label="Slice position"
            className="w-full"
          />
        </LayerCard>
        <section className="space-y-2 rounded-lg border p-2.5">
          <label htmlFor="wake-plane" className="font-medium">
            Wake plane · Ux/U∞ [1]
          </label>
          <select
            id="wake-plane"
            value={wake}
            onChange={(event) => setWake(event.target.value)}
            className="w-full rounded border bg-transparent px-1 py-0.5"
          >
            <option value="off">Off</option>
            <option value="wake1">x/L = 1</option>
            <option value="wake1p5">x/L = 1.5</option>
            <option value="wake2">x/L = 2</option>
          </select>
          <div className="h-2 rounded-sm" style={{ background: gradient("jet") }} />
          <p className="font-mono text-muted-foreground">−0.2 to 1.2 [1]</p>
          <p className="text-muted-foreground">
            x is measured from the case origin; L is car length. Values outside the solved domain
            are unavailable.
          </p>
          {wakeStatus && <p role="status">{wakeStatus}</p>}
          {wake !== "off" && !wakeStatus && (
            <a
              className="underline"
              href={`/api/v1/cfd/runs/${encodeURIComponent(runId)}/vtk/${wake}.vtp`}
              download
            >
              Download wake plane VTP
            </a>
          )}
        </section>
        <section className="space-y-2 rounded-lg border p-2.5">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={vortex}
              onChange={(event) => setVortex(event.target.checked)}
            />{" "}
            Q-criterion surfaces
          </label>
          <div className="h-2 rounded-sm" style={{ background: gradient("jet") }} />
          <p className="font-mono text-muted-foreground">U/U∞: 0 to 1.25 [1]</p>
          <p className="text-muted-foreground">
            Isosurfaces at Q/(U∞/L)² = 50 and 200; coloured by speed ratio. Fixed thresholds can
            miss weaker structures.
          </p>
          {vortexStatus && <p role="status">{vortexStatus}</p>}
          {vortex && !vortexStatus && (
            <a
              className="underline"
              href={`/api/v1/cfd/runs/${encodeURIComponent(runId)}/vtk/vortex.vtp`}
              download
            >
              Download Q surfaces VTP
            </a>
          )}
        </section>
      </aside>
    </div>
  );
}

function LayerCard({
  title,
  style,
  range,
  onToggle,
  onPreset,
  children,
}: {
  title: string;
  style: LayerStyle;
  range: readonly [number, number];
  onToggle: () => void;
  onPreset: (p: (typeof PRESETS)[number]) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-2.5">
      <header className="flex items-center justify-between">
        <span className={cn("font-medium", !style.visible && "text-muted-foreground")}>
          {title}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={style.visible ? `Hide ${title}` : `Show ${title}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {style.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
      </header>
      <select
        value={style.preset}
        onChange={(e) => {
          const v = e.target.value;
          if (isPreset(v)) onPreset(v);
        }}
        aria-label={`${title} colour map`}
        className="rounded border bg-transparent px-1 py-0.5"
      >
        {PRESETS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <div className="h-2 rounded-sm" style={{ background: gradient(style.preset) }} />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{range[0]}</span>
        <span>{range[1]}</span>
      </div>
      {children}
    </section>
  );
}
