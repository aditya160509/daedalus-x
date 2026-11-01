import { AlertTriangle } from "lucide-react";
import { EmptyState, Metric, Panel } from "@/components/ui/primitives";
import { ApiError, type MonteCarlo, type RaceSimulation } from "@/lib/api";

export function MetricsRow({
  sim,
  mc,
  error,
  valid,
}: {
  sim?: RaceSimulation;
  mc?: MonteCarlo;
  error: Error | null;
  valid: boolean;
}) {
  if (!valid) {
    return (
      <Panel title="Prediction" className="shrink-0">
        <EmptyState icon={<AlertTriangle size={18} />} title="Inputs out of range">
          Fix the highlighted fields to run the race model.
        </EmptyState>
      </Panel>
    );
  }
  if (error) {
    return (
      <Panel title="Prediction" className="shrink-0">
        <EmptyState icon={<AlertTriangle size={18} />} title="Simulation unavailable">
          {error instanceof ApiError ? error.message : String(error)}
        </EmptyState>
      </Panel>
    );
  }
  const peakDrag = Math.max(...(sim?.channels.find((c) => c.name === "drag")?.values ?? [0]));
  const p = mc?.percentiles_s;
  return (
    <div className="grid shrink-0 grid-cols-5 gap-3">
      <Metric
        label="Travel time"
        value={sim?.finished && sim.time_s !== null ? sim.time_s.toFixed(3) : "DNF"}
        unit={sim?.finished ? "s" : undefined}
        provenance="predicted"
        tone={sim?.finished ? "default" : "danger"}
        hint={
          sim?.finished
            ? `Model ${sim.model} · inputs ${sim.input_provenance.join(", ")}`
            : (sim?.stop_reason ?? "Integrating the equations of motion.")
        }
      />
      <Metric
        label="Race-time spread"
        value={p?.p50 != null ? p.p50.toFixed(3) : "—"}
        unit={p?.p50 != null ? "s" : undefined}
        provenance="predicted"
        hint={
          p?.p50 != null
            ? `p5 ${p.p5.toFixed(3)} · p95 ${p.p95.toFixed(3)} · ${(
                (mc?.finish_fraction ?? 0) * 100
              ).toFixed(0)}% finish`
            : "1000 seeded Monte Carlo samples"
        }
      />
      <Metric
        label="Peak speed"
        value={(sim?.peak_speed_m_s ?? 0).toFixed(2)}
        unit="m/s"
        provenance="predicted"
        hint={`${((sim?.peak_speed_m_s ?? 0) * 3.6).toFixed(1)} km/h`}
      />
      <Metric
        label="Peak drag"
        value={peakDrag.toFixed(3)}
        unit="N"
        provenance="predicted"
        hint="0.5 · ρ · CdA · v²"
      />
      <Metric
        label="Evidence status"
        value="Unvalidated"
        tone="risk"
        hint="No measured race run to compare against yet"
      />
    </div>
  );
}
