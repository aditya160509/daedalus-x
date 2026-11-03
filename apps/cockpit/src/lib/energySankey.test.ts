import { describe, expect, it } from "vitest";
import { energySankey } from "./energySankey";
import type { EnergyAudit } from "./api";

function audit(work: number): EnergyAudit {
  return {
    thrust_work_j: work,
    kinetic_energy_j: 6,
    losses_j: { drag: 3, rolling: 1 },
    total_loss_j: 4,
    conversion_efficiency: 6 / work,
    dominant_loss: "drag",
    thrust_end_s: 0.3,
    kinetic_energy_at_thrust_end_j: 8,
    coast_phase_loss_j: 2,
    closure_error_j: work - 10,
    closure_fraction: Math.abs(work - 10) / work,
    flows: [
      { source: "thrust", target: "kinetic_energy", value_j: 6 },
      { source: "thrust", target: "drag", value_j: 3 },
      { source: "thrust", target: "rolling", value_j: 1 },
    ],
  };
}

describe("energy account", () => {
  it.each([9, 10, 11])(
    "preserves physical terms and accounts for signed integration error (%s J)",
    (work) => {
      const graph = energySankey(audit(work))!;
      const incoming = graph.links
        .filter((f) => f.target === "Energy account")
        .reduce((s, f) => s + f.value, 0);
      const outgoing = graph.links
        .filter((f) => f.source === "Energy account")
        .reduce((s, f) => s + f.value, 0);
      expect(incoming).toBe(outgoing);
      expect(graph.links.find((f) => f.target === "Aerodynamic drag")?.value).toBe(3);
      expect(graph.links.find((f) => f.source === "Thrust work")?.value).toBe(work);
    },
  );
  it("rejects invalid flows instead of clamping them", () => {
    const input = audit(10);
    input.flows[0].value_j = -1;
    expect(energySankey(input)).toBeNull();
  });
});
