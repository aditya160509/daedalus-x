"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useState } from "react";
import type { TelemetryTrack } from "@/components/charts/TelemetryChart";
import { cn } from "@/lib/utils";

const ZOOMS = [1, 2, 4, 8] as const;

/** Show/hide, reorder (drag or buttons) and per-channel y-zoom for the wall. */
export function ChannelPicker({
  tracks,
  order,
  visible,
  yZoom,
  onToggle,
  onReorder,
  onZoom,
}: {
  tracks: TelemetryTrack[];
  order: string[];
  visible: Record<string, boolean>;
  yZoom: Record<string, number>;
  onToggle: (id: string) => void;
  onReorder: (order: string[]) => void;
  onZoom: (id: string, zoom: number) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const ordered = order.flatMap((id) => {
    const track = byId.get(id);
    return track ? [track] : [];
  });

  const move = (id: string, direction: -1 | 1) => {
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    next[index] = order[target];
    next[target] = id;
    onReorder(next);
  };

  const drop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter((id) => id !== dragId);
    const at = next.indexOf(targetId);
    next.splice(at < 0 ? next.length : at, 0, dragId);
    onReorder(next);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-3 py-2">
      <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Channels</span>
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Telemetry channels">
        {ordered.map((track, index) => {
          const on = visible[track.id] ?? true;
          return (
            <li
              key={track.id}
              draggable
              onDragStart={() => setDragId(track.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setOverId(track.id);
              }}
              onDrop={() => drop(track.id)}
              className={cn(
                "flex items-center gap-1 rounded-md border bg-secondary/40 py-0.5 pr-1 pl-1.5",
                overId === track.id && dragId !== track.id && "border-brand/60",
                dragId === track.id && "opacity-50",
              )}
            >
              <GripVertical size={11} className="cursor-grab text-muted-foreground" aria-hidden />
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-text-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(track.id)}
                  className="size-3 accent-[var(--brand)]"
                  aria-label={`Show ${track.name}`}
                />
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: track.color }}
                  aria-hidden
                />
                {track.name}
              </label>
              <span className="font-mono text-[9px] text-muted-foreground">{track.unit}</span>
              <select
                aria-label={`${track.name} y-zoom`}
                value={yZoom[track.id] ?? 1}
                onChange={(event) => onZoom(track.id, Number(event.target.value))}
                className="h-5 rounded-sm border bg-background px-0.5 font-mono text-[9px] text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
              >
                {ZOOMS.map((zoom) => (
                  <option key={zoom} value={zoom}>
                    {zoom}×
                  </option>
                ))}
              </select>
              <span className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Move ${track.name} up`}
                  disabled={index === 0}
                  onClick={() => move(track.id, -1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp size={9} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${track.name} down`}
                  disabled={index === ordered.length - 1}
                  onClick={() => move(track.id, 1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown size={9} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <span className="ml-auto hidden text-[10px] text-muted-foreground lg:inline">
        Drag to reorder · y-zoom clips around the channel mid
      </span>
    </div>
  );
}
