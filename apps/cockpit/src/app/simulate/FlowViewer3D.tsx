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
import { cn } from "@/lib/utils";

const PRESETS = ["Cool to Warm", "jet", "Viridis (matplotlib)", "Inferno (matplotlib)"] as const;
// Array names as exported (ASCII: vtk.js does not match non-ASCII names) -> label, range.
const FIELDS = {
  U_Uinf: ["U/U∞", [0, 1.25]],
  Ux_Uinf: ["Ux/U∞", [-0.2, 1.2]],
  Cp: ["Cp", [-1, 1]],
} as const satisfies Record<string, readonly [string, readonly [number, number]]>;
type Field = keyof typeof FIELDS;
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
  return `linear-gradient(to right, ${stops.join(",")})`;
}

async function fetchLayer(runId: string, file: string): Promise<ArrayBuffer> {
  const res = await fetch(`/api/v1/cfd/runs/${encodeURIComponent(runId)}/vtk/${file}`, {
    cache: "no-cache", // revalidate: layers are rebuilt when a run is re-solved
  });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  return res.arrayBuffer();
}

export function FlowViewer3D({ runId }: { runId: string }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{
    render: () => void;
    reset: () => void;
    surface: vtkActor;
    lines: vtkActor;
    slice: vtkImageSlice;
    image: vtkImageData;
  } | null>(null);
  const [layers, setLayers] = useState<Layers>(INITIAL);
  const [status, setStatus] = useState<"loading" | "ready" | string>("loading");

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    setStatus("loading");
    const grw = vtkGenericRenderWindow.newInstance({ background: [0.043, 0.047, 0.059] });
    grw.setContainer(host.current);
    grw.resize();
    const renderer = grw.getRenderer();
    const win = grw.getRenderWindow();
    const observer = new ResizeObserver(() => grw.resize());
    observer.observe(host.current);

    (async () => {
      const [s, l, v] = await Promise.all(
        ["surface.vtp", "streamlines.vtp", "volume.vti"].map((f) => fetchLayer(runId, f)),
      );
      if (cancelled) return;
      const poly = (buf: ArrayBuffer) => {
        const r = vtkXMLPolyDataReader.newInstance();
        r.parseAsArrayBuffer(buf);
        return r.getOutputData(0);
      };
      const imgReader = vtkXMLImageDataReader.newInstance();
      imgReader.parseAsArrayBuffer(v);
      const image = imgReader.getOutputData(0) as vtkImageData;

      const colored = (data: ReturnType<typeof poly>, array: string) => {
        const mapper = vtkMapper.newInstance({
          scalarVisibility: true,
          useLookupTableScalarRange: true,
        });
        mapper.setScalarModeToUsePointFieldData();
        mapper.setColorByArrayName(array);
        mapper.setInputData(data);
        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        renderer.addActor(actor);
        return actor;
      };
      const surface = colored(poly(s), "Cp");
      surface.getProperty().setSpecular(0.3);
      const lines = colored(poly(l), "U_Uinf");
      lines.getProperty().setLineWidth(1.5);

      const sliceMapper = vtkImageMapper.newInstance();
      sliceMapper.setInputData(image);
      const slice = vtkImageSlice.newInstance();
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
      scene.current = { render: () => win.render(), reset, surface, lines, slice, image };
      reset();
      setStatus("ready");
    })().catch((err: unknown) => {
      if (!cancelled) setStatus(err instanceof Error ? err.message : String(err));
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      scene.current = null;
      grw.delete();
    };
  }, [runId]);

  // Apply layer styles whenever they (or the scene) change.
  useEffect(() => {
    const sc = scene.current;
    if (!sc || status !== "ready") return;
    sc.surface.setVisibility(layers.surface.visible);
    sc.surface.getMapper()!.setLookupTable(lut(layers.surface.preset, FIELDS.Cp[1]));
    sc.lines.setVisibility(layers.streamlines.visible);
    sc.lines.getMapper()!.setLookupTable(lut(layers.streamlines.preset, FIELDS.U_Uinf[1]));

    const { field, axis, pos, preset, visible } = layers.slice;
    sc.image.getPointData().setActiveScalars(field);
    const mapper = sc.slice.getMapper() as vtkImageMapper;
    const dims = sc.image.getDimensions();
    const i = AXES.indexOf(axis);
    mapper.setSlicingMode(
      [vtkImageMapper.SlicingMode.I, vtkImageMapper.SlicingMode.J, vtkImageMapper.SlicingMode.K][i],
    );
    mapper.setSlice(Math.round(pos * (dims[i] - 1)));
    sc.slice.getProperty().setRGBTransferFunction(0, lut(preset, FIELDS[field][1]));
    sc.slice.setVisibility(visible);
    sc.render();
  }, [layers, status]);

  const set = <K extends keyof Layers>(k: K, patch: Partial<Layers[K]>) =>
    setLayers((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  return (
    <div className="flex h-full min-h-0 gap-3">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border">
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

      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto text-xs">
        <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
          Pipeline
        </p>
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
              onChange={(e) => set("slice", { field: e.target.value as Field })}
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
        onChange={(e) => onPreset(e.target.value as (typeof PRESETS)[number])}
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
