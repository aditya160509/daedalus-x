"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SegmentedControl } from "@/components/ui/primitives";
import { Slider } from "@/components/ui/slider";
import type { LoadedModel } from "@/lib/gltf";
import { RaceTrackScene, type ReplayCamera } from "./RaceTrackScene";
import { useRacePlayback, type RaceTrace } from "./useRaceCar";

const SPEEDS = [
  { value: "0.25", label: "¼×" },
  { value: "0.5", label: "½×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
] as const;

const CAMERAS = [
  { value: "side", label: "Side" },
  { value: "chase", label: "Chase" },
  { value: "top", label: "Top" },
] as const;

/** Playback transport plus the 3D stage; the cursor is owned by the workspace. */
export function RaceReplay({
  trackM,
  model,
  ghostModel,
  primary,
  ghost,
  cursor,
  onCursor,
  hasGhost,
}: {
  trackM: number;
  model: LoadedModel | null;
  ghostModel: LoadedModel | null;
  primary: RaceTrace;
  ghost: RaceTrace | null;
  cursor: number;
  onCursor: (t: number) => void;
  hasGhost: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [camera, setCamera] = useState<ReplayCamera>("side");
  const endTime = useMemo(() => {
    const last = (trace: RaceTrace | null) =>
      trace && trace.time.length > 0 ? trace.time[trace.time.length - 1] : 0;
    return Math.max(last(primary), last(ghost));
  }, [primary, ghost]);

  useRacePlayback({
    cursor,
    playing,
    speed: Number(speed),
    endTime,
    onTime: onCursor,
    onEnd: () => setPlaying(false),
  });

  const toggle = () => {
    if (!playing && cursor >= endTime - 1e-6) onCursor(0);
    setPlaying((value) => !value);
  };

  // Space plays or pauses, but only when no control has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target !== document.body) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        {model ? (
          <RaceTrackScene
            trackM={trackM}
            model={model}
            ghostModel={ghostModel}
            primary={primary}
            ghost={hasGhost ? ghost : null}
            cursor={cursor}
            camera={camera}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            Pick a design with a display mesh to see the cars on track. The race model still runs
            without one.
          </div>
        )}
        <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-2 rounded-md border border-border/70 bg-card/80 px-2 py-1 font-mono text-[10px] text-text-2 backdrop-blur">
          <span className="text-brand">{cursor.toFixed(3)}</span>
          <span className="text-muted-foreground">/ {endTime.toFixed(3)} s</span>
          {hasGhost && <span className="text-ok">2 cars</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="flex size-7 items-center justify-center rounded-md border bg-secondary/60 text-text-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            onCursor(0);
          }}
          aria-label="Restart replay"
          className="flex size-7 items-center justify-center rounded-md border bg-secondary/60 text-text-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <RotateCcw size={13} />
        </button>
        <div className="flex min-w-48 flex-1 items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {cursor.toFixed(2)} s
          </span>
          <Slider
            aria-label="Replay timeline"
            min={0}
            max={Math.max(endTime, 0.001)}
            step={0.01}
            value={[Math.min(cursor, endTime)]}
            disabled={endTime <= 0}
            onValueChange={([t]) => {
              setPlaying(false);
              onCursor(t);
            }}
          />
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {endTime.toFixed(2)} s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Speed</span>
          <SegmentedControl
            label="Playback speed"
            value={speed}
            onChange={setSpeed}
            options={SPEEDS}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Camera</span>
          <SegmentedControl
            label="Replay camera"
            value={camera}
            onChange={setCamera}
            options={CAMERAS}
          />
        </div>
      </div>
    </div>
  );
}
