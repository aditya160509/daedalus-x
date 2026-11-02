"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { clampedSampleAt, timeAtDistance, velocityAt } from "./raceMath";
import { Slider } from "@/components/ui/slider";
import type { LoadedModel } from "@/lib/gltf";
import { RaceTrackScene, type ReplayCamera } from "./RaceTrackScene";
import { useRacePlayback, type RaceTrace } from "./useRaceCar";

const SPEEDS = [
  { value: "0.125", label: "⅛×" },
  { value: "0.25", label: "¼×" },
  { value: "0.5", label: "½×" },
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
] as const;

const CAMERAS = [
  { value: "auto", label: "Director" },
  { value: "side", label: "Side" },
  { value: "chase", label: "Chase" },
  { value: "onboard", label: "Onboard" },
  { value: "top", label: "Top" },
  { value: "finish", label: "Finish" },
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
  const [camera, setCamera] = useState<ReplayCamera>("auto");
  const capture = useRef<(() => void) | null>(null);
  const [stats, setStats] = useState(false);
  const finish = timeAtDistance(trackM, primary.time, primary.position);
  const ghostFinish = ghost ? timeAtDistance(trackM, ghost.time, ghost.position) : null;
  const photoTime = Math.min(finish ?? Infinity, ghostFinish ?? Infinity);
  const speedMps = velocityAt(cursor, primary);
  const distance = clampedSampleAt(cursor, primary.time, primary.position) ?? 0;
  const ghostDistance = ghost ? clampedSampleAt(cursor, ghost.time, ghost.position) : null;
  const common = Math.min(distance, ghostDistance ?? distance);
  const ta = timeAtDistance(common, primary.time, primary.position);
  const tb = ghost ? timeAtDistance(common, ghost.time, ghost.position) : null;
  const gapMs = ta !== null && tb !== null ? (tb - ta) * 1000 : null;
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
    <div className="flex h-full min-h-0 flex-col [&_[data-slot=toggle-group]]:max-w-full [&_[data-slot=toggle-group]]:flex-wrap">
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
            capture={capture}
            stats={stats}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            Pick a design with a display mesh to see the cars on track. The race model still runs
            without one.
          </div>
        )}
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap gap-2">
          {[
            ["Time", `${cursor.toFixed(3)} s`],
            ["Speed", speedMps === null ? "—" : `${(speedMps * 3.6).toFixed(1)} km/h`],
            ["Distance", `${distance.toFixed(2)} m`],
            ["Ghost Δ", gapMs === null ? "—" : `${gapMs >= 0 ? "+" : ""}${gapMs.toFixed(2)} ms`],
            ["Reaction", "Not supplied"],
          ].map(([name, value]) => (
            <div
              key={name}
              className="rounded-md border border-white/10 bg-black/55 px-2.5 py-1.5 text-white backdrop-blur-sm"
            >
              <div className="text-[9px] tracking-wide text-white/55 uppercase">{name}</div>
              <div className="font-mono text-xs tabular-nums">{value}</div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-3 text-[9px] text-white/40">
          Launch puff illustrative · trajectory from race model
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2">
        <Button
          variant="outline"
          size="icon-xs"
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="flex size-7 items-center justify-center rounded-md border bg-secondary/60 text-text-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          type="button"
          onClick={() => {
            setPlaying(false);
            onCursor(0);
          }}
          aria-label="Restart replay"
          className="flex size-7 items-center justify-center rounded-md border bg-secondary/60 text-text-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          <RotateCcw size={13} />
        </Button>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Camera</span>
          <SegmentedControl
            label="Replay camera"
            value={camera}
            onChange={setCamera}
            options={CAMERAS}
          />
        </div>
        <Button
          size="xs"
          variant="outline"
          disabled={!Number.isFinite(photoTime)}
          onClick={() => {
            onCursor(Math.max(0, photoTime - 0.2));
            setCamera("finish");
            setSpeed("0.125");
            setPlaying(true);
          }}
        >
          Photo finish · ⅛×
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={!Number.isFinite(photoTime)}
          onClick={() => {
            setPlaying(false);
            setCamera("finish");
            onCursor(photoTime);
          }}
        >
          Finish-line still
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            setPlaying(false);
            requestAnimationFrame(() => capture.current?.());
          }}
        >
          Save frame
        </Button>
        <Button
          size="xs"
          variant="ghost"
          aria-pressed={stats}
          onClick={() => setStats((value) => !value)}
        >
          FPS
        </Button>
      </div>
    </div>
  );
}
