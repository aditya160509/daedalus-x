import { useCallback, useEffect, useRef, useState } from "react";
import { type RaceSimulationRequest, raceMonteCarlo, type UncertaintyInput } from "@/lib/api";

/** A tweakable car input; the sweep and the sparkline address each by name. */
export type WhatIfParam = "massG" | "cdaCm2" | "crr" | "thrustScale";

/** Full slider domain per parameter; the sweep always covers both ends. */
export const WHAT_IF_DOMAINS: Record<WhatIfParam, { min: number; max: number }> = {
  massG: { min: 1, max: 1000 },
  cdaCm2: { min: 0, max: 500 },
  crr: { min: 0, max: 1 },
  thrustScale: { min: 0.05, max: 5 },
};

export interface WhatIfPoint {
  value: number;
  /** Median Monte Carlo race time; null when no sample finished. */
  timeS: number | null;
}

export interface WhatIfCurve {
  points: WhatIfPoint[];
  error: string | null;
}

export type WhatIfCurves = Record<WhatIfParam, WhatIfCurve | null>;

const NO_CURVES: WhatIfCurves = {
  massG: null,
  cdaCm2: null,
  crr: null,
  thrustScale: null,
};

/** `count` evenly spaced values from min to max, both ends included. */
export function sweepValues(min: number, max: number, count = 15): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  if (count < 2) return [min, max];
  const step = (max - min) / (count - 1);
  const decimals = step >= 0.1 ? 3 : 6;
  return Array.from({ length: count }, (_, i) => Number((min + step * i).toFixed(decimals)));
}

const SWEEP_N = 200; // spec: each sweep point uses the Monte Carlo API at n = 200

/**
 * Median race time across a slider's whole domain, one 15-point sweep per parameter, run only
 * on commit. Requests are counted, so a sweep started later always wins over an earlier one.
 */
export function useWhatIfSweep(
  build: (param: WhatIfParam, value: number) => RaceSimulationRequest,
  unc: UncertaintyInput,
): {
  curves: WhatIfCurves;
  running: WhatIfParam | null;
  sweep: (param: WhatIfParam) => void;
} {
  const [curves, setCurves] = useState<WhatIfCurves>(NO_CURVES);
  const [running, setRunning] = useState<WhatIfParam | null>(null);
  const token = useRef(0);
  const buildRef = useRef(build);
  const uncRef = useRef(unc);
  useEffect(() => {
    buildRef.current = build;
    uncRef.current = unc;
  }, [build, unc]);

  const sweep = useCallback((param: WhatIfParam) => {
    const values = sweepValues(WHAT_IF_DOMAINS[param].min, WHAT_IF_DOMAINS[param].max);
    const mine = ++token.current;
    setRunning(param);
    void (async () => {
      const settled = await Promise.allSettled(
        values.map((value) =>
          raceMonteCarlo(buildRef.current(param, value), uncRef.current, SWEEP_N),
        ),
      );
      if (token.current !== mine) return;
      const failed = settled.find((s) => s.status === "rejected");
      let error: string | null = null;
      if (failed && failed.status === "rejected") {
        error = failed.reason instanceof Error ? failed.reason.message : "Sweep request failed";
      }
      const points = settled.map((s, i): WhatIfPoint => {
        if (s.status !== "fulfilled") return { value: values[i], timeS: null };
        const mc = s.value;
        return { value: values[i], timeS: mc.percentiles_s.p50 ?? null };
      });
      setCurves((previous) => ({ ...previous, [param]: { points, error } }));
      setRunning((current) => (current === param ? null : current));
    })();
  }, []);

  return { curves, running, sweep };
}
