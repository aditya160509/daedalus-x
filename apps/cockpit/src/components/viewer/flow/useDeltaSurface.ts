"use client";

import { useEffect, useState } from "react";
import type { FlowMesh } from "../../../lib/api";
import { deltaRange, type WorkerResult } from "./flowMath";
import type { DeltaSurface } from "./types";

interface DeltaState {
  key: FlowMesh | null;
  surface: DeltaSurface | null;
  error: string | null;
}

/**
 * Maps run B's Cp onto run A's vertices in a worker. The returned mesh keeps A's topology,
 * so the comparison is always drawn on one car; `mapped` records the nearest-vertex lookup.
 */
export function useDeltaSurface(
  a: FlowMesh | undefined,
  b: FlowMesh | undefined,
): { surface: DeltaSurface | null; error: string | null } {
  const [state, setState] = useState<DeltaState>({ key: null, surface: null, error: null });
  const key = a && b ? a : null;

  useEffect(() => {
    if (!a || !b) return undefined;
    let live = true;
    const worker = new Worker(new URL("./flow.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<WorkerResult>) => {
      if (!live) return;
      const data = event.data;
      if (data.kind === "delta") {
        const range = deltaRange(data.data.scalar);
        setState({
          key: a,
          surface: {
            mesh: { ...a, scalar: data.data.scalar, range, name: "ΔCp" },
            range,
            mapped: data.data.mapped,
            rmsDistance: data.data.rmsDistance,
          },
          error: null,
        });
      } else if (data.kind === "error") {
        setState({ key: a, surface: null, error: data.message });
      }
    });
    worker.addEventListener("error", () =>
      setState({
        key: a,
        surface: null,
        error: "The delta worker failed; comparison surface is unavailable.",
      }),
    );
    // Worker.postMessage takes no targetOrigin; this is not a window message.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    worker.postMessage({ kind: "delta", a, b });
    return () => {
      live = false;
      worker.terminate();
    };
  }, [a, b]);

  // A previous run's worker result is never shown against the current pair.
  if (state.key !== key) return { surface: null, error: null };
  return { surface: state.surface, error: state.error };
}
