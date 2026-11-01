"use client";

import { AlertTriangle, Box, FileUp, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { designGlbUrl, listDesigns } from "@/lib/api";
import {
  Button,
  EmptyState,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
} from "@/components/ui/primitives";
import type { CameraPreset } from "@/components/viewer/CarViewer";
import { cn } from "@/lib/utils";
import { type LoadedModel, loadGlb, loadGlbUrl } from "@/lib/gltf";

const CarViewer = dynamic(() => import("@/components/viewer/CarViewer").then((m) => m.CarViewer), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-surface-2" />,
});

const PRESETS: ReadonlyArray<{ value: CameraPreset; label: string }> = [
  { value: "iso", label: "Iso" },
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "top", label: "Top" },
];

export function DesignWorkspace() {
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [maximised, setMaximised] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const open = useCallback(async (file: File) => {
    setError(null);
    if (!/\.glb$/i.test(file.name)) {
      setError(
        "Only binary glTF (.glb) is supported for display. Use STEP/native CAD for geometry checks.",
      );
      return;
    }
    setLoading(true);
    try {
      setModel(await loadGlb(file));
      setSelected(null);
      setNonce((n) => n + 1);
    } catch (e) {
      setError(`Could not read ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the first imported reference design from the API so the workspace opens on a real car.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const designs = await listDesigns();
        const first = designs[0];
        if (!first || cancelled) return;
        setLoading(true);
        const loaded = await loadGlbUrl(designGlbUrl(first.design_id), `${first.design_id}.glb`);
        if (cancelled) return;
        setModel((current) => current ?? loaded);
        setNonce((n) => n + 1);
      } catch {
        // API offline: the drop zone remains the entry point.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPart = model?.parts.find((p) => p.uuid === selected);
  const choosePreset = (p: CameraPreset) => {
    setPreset(p);
    setNonce((n) => n + 1);
  };

  return (
    <div
      className={cn("grid h-full gap-3 p-3", maximised ? "grid-cols-1" : "grid-cols-[1fr_320px]")}
    >
      <Panel
        title={model ? model.fileName : "Viewport"}
        actions={
          <>
            {model && (
              <SegmentedControl
                label="Camera"
                value={preset}
                onChange={choosePreset}
                options={PRESETS}
              />
            )}
            <Button onClick={() => input.current?.click()} disabled={loading}>
              <FileUp size={13} /> {model ? "Replace" : "Import GLB"}
            </Button>
            {model && (
              <Button
                variant="ghost"
                aria-label={maximised ? "Restore layout" : "Maximise viewport"}
                onClick={() => setMaximised((m) => !m)}
              >
                {maximised ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </Button>
            )}
            <input
              ref={input}
              type="file"
              accept=".glb,model/gltf-binary"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void open(f);
                e.target.value = "";
              }}
            />
          </>
        }
        bodyClassName="relative"
      >
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            dragOver && "bg-brand/5 ring-2 ring-brand ring-inset",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void open(f);
          }}
        >
          {model ? (
            <CarViewer
              scene={model.scene}
              selected={selected}
              onSelect={setSelected}
              preset={preset}
              presetNonce={nonce}
            />
          ) : (
            <EmptyState
              icon={<Box size={20} />}
              title={loading ? "Loading model…" : "No car model loaded"}
              action={
                <Button variant="primary" onClick={() => input.current?.click()} disabled={loading}>
                  <FileUp size={13} /> Import GLB
                </Button>
              }
            >
              Drop a .glb here or import one. GLB is for display and part selection; CFD and rule
              checks need the STEP or native CAD file.
            </EmptyState>
          )}
          {error && (
            <div
              role="alert"
              className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-danger/50 bg-surface-2 px-3 py-2 text-xs text-danger"
            >
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>
      </Panel>

      {!maximised && (
        <div className="flex min-h-0 flex-col gap-3">
          <Panel
            title="Model"
            actions={
              model && <ProvenanceBadge value="estimated" title="display mesh, not canonical CAD" />
            }
            bodyClassName="p-3"
          >
            {model ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <Row k="Length (x)" v={`${(model.extents.x * 1000).toFixed(1)} mm`} />
                <Row k="Height (y)" v={`${(model.extents.y * 1000).toFixed(1)} mm`} />
                <Row k="Width (z)" v={`${(model.extents.z * 1000).toFixed(1)} mm`} />
                <Row k="Triangles" v={model.triangles.toLocaleString()} />
                <Row k="Parts" v={String(model.parts.length)} />
                <dt className="text-muted-foreground">SHA-256</dt>
                <dd className="truncate font-mono text-[10px] text-text-2" title={model.sha256}>
                  {model.sha256.slice(0, 16)}…
                </dd>
                <dd className="col-span-2 pt-1 text-2xs text-muted-foreground">
                  Bounding box of the display mesh, assuming glTF metres. Not valid for
                  scrutineering.
                </dd>
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">Import a model to see its dimensions.</p>
            )}
          </Panel>
          <Panel title="Parts" bodyClassName="overflow-y-auto py-1">
            {model?.parts.length ? (
              <ul aria-label="Parts">
                {model.parts.map((p) => (
                  <li key={p.uuid}>
                    <button
                      type="button"
                      aria-pressed={p.uuid === selected}
                      onClick={() => setSelected(p.uuid === selected ? null : p.uuid)}
                      className={cn(
                        "flex w-full items-center gap-2 py-1 pr-3 text-left text-xs text-text-2 hover:bg-surface-3 hover:text-text",
                        p.uuid === selected && "bg-brand/10 text-brand",
                      )}
                      style={{ paddingLeft: 12 + p.depth * 12 }}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="tabular ml-auto font-mono text-[10px] text-muted-foreground">
                        {p.triangles.toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {model ? "No named parts in this file." : "—"}
              </p>
            )}
          </Panel>
          {selectedPart && (
            <Panel title="Selection" bodyClassName="p-3 text-xs space-y-1">
              <div className="font-medium text-text">{selectedPart.name}</div>
              <div className="text-muted-foreground">
                {selectedPart.meshCount} mesh(es) · {selectedPart.triangles.toLocaleString()}{" "}
                triangles
              </div>
              <div className="pt-1 text-2xs text-muted-foreground">
                Rules, CFD forces and measurements link here once those records exist.
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular text-right font-mono text-text">{v}</dd>
    </>
  );
}
