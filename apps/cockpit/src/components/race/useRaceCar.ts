"use client";

import { useEffect, useRef } from "react";
import { clampedSampleAt } from "./raceMath";

export interface RaceTrace {
  time: readonly number[];
  position: readonly number[];
}

/** Car position at a cursor time; holds at the line once the run has ended. */
export function positionAt(t: number, trace: RaceTrace): number | null {
  return clampedSampleAt(t, trace.time, trace.position);
}

/**
 * Advances the shared cursor while playback runs. The cursor lives in the workspace, so the
 * chart, the table and both cars always read the same time. The loop only restarts when play
 * state or speed changes, never on every cursor tick.
 */
export function useRacePlayback({
  cursor,
  playing,
  speed,
  endTime,
  onTime,
  onEnd,
}: {
  cursor: number;
  playing: boolean;
  speed: number;
  endTime: number;
  onTime: (t: number) => void;
  onEnd: () => void;
}): void {
  const state = useRef({ cursor, onTime, onEnd });
  useEffect(() => {
    state.current.onTime = onTime;
    state.current.onEnd = onEnd;
  }, [onTime, onEnd]);

  useEffect(() => {
    state.current.cursor = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!playing || !(endTime > 0)) return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const next = Math.min(state.current.cursor + delta * speed, endTime);
      state.current.cursor = next;
      state.current.onTime(next);
      if (next >= endTime) {
        state.current.onEnd();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, endTime]);
}
