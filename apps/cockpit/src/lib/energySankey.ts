import type { EnergyAudit } from "./api";

const LABELS: Record<string, string> = {
  kinetic_energy: "Kinetic energy",
  drag: "Aerodynamic drag",
  rolling: "Rolling loss",
};

/** Keep the integration residual visible; never rescale physical terms to force closure. */
export function energySankey(data: EnergyAudit) {
  const account = "Energy account";
  const outputs = data.flows.map((flow) => ({
    source: account,
    target: LABELS[flow.target] ?? flow.target,
    value: flow.value_j,
  }));
  if (
    !Number.isFinite(data.thrust_work_j) ||
    data.thrust_work_j <= 0 ||
    outputs.some((f) => !Number.isFinite(f.value) || f.value < 0)
  )
    return null;
  const residual = data.thrust_work_j - outputs.reduce((sum, flow) => sum + flow.value, 0);
  const links = [{ source: "Thrust work", target: account, value: data.thrust_work_j }, ...outputs];
  if (residual > 0)
    links.push({ source: account, target: "Integration remainder", value: residual });
  if (residual < 0)
    links.push({ source: "Integration surplus", target: account, value: -residual });
  return {
    nodes: [...new Set(links.flatMap((f) => [f.source, f.target]))].map((name) => ({ name })),
    links,
  };
}
