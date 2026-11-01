import type { Provenance } from "@/lib/api";
import type { ThrustEstimate, ThrustTrace } from "@/lib/thrust";

/** Starting assumptions, all labelled "estimated": spec §1.3 scenario values plus a 20 m track. */
export const DEFAULT_CAR = { massG: 55, trackM: 20, cdaCm2: 15, crr: 0.02, rho: 1.204 };
export const DEFAULT_ESTIMATE: ThrustEstimate = {
  peakN: 20,
  riseS: 0.02,
  decayTauS: 0.06,
  burnS: 0.4,
};

export type ThrustSource =
  | { kind: "estimate"; params: ThrustEstimate }
  | { kind: "file"; name: string; trace: ThrustTrace; provenance: Provenance };

export type CarParamsUi = {
  massG: number;
  trackM: number;
  cdaCm2: number;
  crr: number;
  rho: number;
};
