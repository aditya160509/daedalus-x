"use client";

import { Panel } from "@/components/ui/primitives";
import { matchCadPart, notWatertight } from "@/components/viewer/design/designMath";
import type { DesignGeometry, DesignSummary } from "@/lib/api";
import type { LoadedModel } from "@/lib/gltf";
import { cn } from "@/lib/utils";

/** Model facts, the selected-part inspector and the part tree. */
export function DesignSidebar({
  model,
  geometry,
  summary,
  selected,
  onSelect,
}: {
  model: LoadedModel | null;
  geometry: DesignGeometry | null;
  summary: DesignSummary | null;
  selected: string | null;
  onSelect: (uuid: string | null) => void;
}) {
  const selectedPart = model?.parts.find((part) => part.uuid === selected) ?? null;
  const cadPart =
    selectedPart && geometry
      ? matchCadPart(selectedPart.label, selectedPart.centroid, geometry.parts)
      : null;
  const watertight =
    selectedPart && geometry ? !notWatertight(selectedPart.label, geometry.warnings) : null;
  const partWarnings =
    selectedPart && geometry
      ? geometry.warnings.filter((warning) => warning.includes(`'${selectedPart.label}'`))
      : [];

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <Panel
        title="Model"
        actions={
          geometry ? (
            <span className="text-[10px] text-muted-foreground">
              {geometry.warnings.length} import warning
              {geometry.warnings.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
        bodyClassName="p-3"
        className="shrink-0"
      >
        {model ? (
          <>
            <dl className="divide-y overflow-hidden rounded-lg border text-xs">
              <Row k="Length (x)" v={`${mm(geometry?.length_m ?? model.extents.x)} mm`} />
              <Row k="Height (y)" v={`${mm(geometry?.height_m ?? model.extents.y)} mm`} />
              <Row k="Width (z)" v={`${mm(geometry?.width_m ?? model.extents.z)} mm`} />
              {geometry && (
                <Row k="Frontal area" v={`${(geometry.frontal_area_m2 * 1e4).toFixed(1)} cm²`} />
              )}
              <Row k="Triangles" v={model.triangles.toLocaleString()} />
              <Row k="Parts" v={String(model.parts.length)} />
              <div className="grid grid-cols-[auto_1fr] gap-x-4 px-3 py-1.5">
                <dt className="text-muted-foreground">Source</dt>
                <dd
                  className="truncate font-mono text-[10px] text-text-2"
                  title={summary?.source_file}
                >
                  {geometry?.source_file ?? model.fileName}
                </dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 px-3 py-1.5">
                <dt className="text-muted-foreground">SHA-256</dt>
                <dd
                  className="truncate font-mono text-[10px] text-text-2"
                  title={geometry?.source_sha256 ?? model.sha256}
                >
                  {(geometry?.source_sha256 ?? model.sha256).slice(0, 20)}…
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-2xs text-muted-foreground">
              {geometry
                ? "Dimensions come from the import record; the viewer draws the tessellated display mesh. Not valid for scrutineering."
                : "Bounding box of the display mesh, assuming glTF metres. Not valid for scrutineering."}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Import a model to see its dimensions.</p>
        )}
      </Panel>

      <Panel title="Inspector" bodyClassName="p-3 text-xs" className="shrink-0">
        {selectedPart ? (
          <div className="space-y-2">
            <div>
              <div className="truncate font-medium text-text" title={selectedPart.label}>
                {selectedPart.label}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded-sm border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-text-2">
                  {selectedPart.group}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {selectedPart.meshCount} mesh{selectedPart.meshCount === 1 ? "" : "es"} ·{" "}
                  {selectedPart.triangles.toLocaleString()} triangles
                </span>
              </div>
            </div>
            <dl className="divide-y overflow-hidden rounded-lg border">
              <Row k="BBox Δx" v={`${mm(selectedPart.bboxMax[0] - selectedPart.bboxMin[0])} mm`} />
              <Row k="BBox Δy" v={`${mm(selectedPart.bboxMax[1] - selectedPart.bboxMin[1])} mm`} />
              <Row k="BBox Δz" v={`${mm(selectedPart.bboxMax[2] - selectedPart.bboxMin[2])} mm`} />
              {cadPart && (
                <Row
                  k="Volume"
                  v={watertight ? `${(cadPart.volume_m3 * 1e6).toFixed(3)} cm³` : "not watertight"}
                  tone={watertight ? undefined : "danger"}
                />
              )}
              {geometry && !cadPart && <Row k="CAD part" v="not in import record" />}
            </dl>
            {partWarnings.length > 0 && (
              <ul className="space-y-1 border-t pt-2 text-[10px] text-risk">
                {partWarnings.slice(0, 2).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <p className="text-2xs text-muted-foreground">
              Display-mesh geometry. Volume and warnings come from the STEP import record.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Select a part in the viewport or the list to inspect its group, triangles, bounding box
            and imported volume.
          </p>
        )}
      </Panel>

      <Panel title="Parts" bodyClassName="overflow-y-auto py-1" className="min-h-0 flex-1">
        {model?.parts.length ? (
          <ul aria-label="Parts">
            {model.parts.map((part) => (
              <li key={part.uuid}>
                <button
                  type="button"
                  aria-pressed={part.uuid === selected}
                  onClick={() => onSelect(part.uuid === selected ? null : part.uuid)}
                  className={cn(
                    "relative flex h-8 w-full items-center gap-2 pr-3 text-left text-xs text-text-2 transition-colors hover:bg-white/[0.04] hover:text-text",
                    part.uuid === selected &&
                      "bg-brand/[0.08] text-brand before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-brand",
                  )}
                  style={{ paddingLeft: 12 + part.depth * 12 }}
                >
                  <span className="truncate">{part.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                    {part.group}
                  </span>
                  <span className="tabular w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                    {part.triangles.toLocaleString()}
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
    </aside>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "danger" }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 px-3 py-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          "tabular truncate text-right font-mono text-text",
          tone === "danger" && "text-danger",
        )}
      >
        {v}
      </dd>
    </div>
  );
}

function mm(metres: number): string {
  return (metres * 1000).toFixed(1);
}
