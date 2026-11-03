export interface ForceContribution {
  name: string;
  pressure: number;
  viscous: number;
}

/** Preserve signed contributions in source order; the total is computed, never a measured claim. */
export function forceWaterfall(data: ForceContribution[]) {
  let total = 0;
  const rows = data.map((force) => {
    const start = total;
    const delta = force.pressure + force.viscous;
    total += delta;
    return {
      name: force.name,
      start,
      end: total,
      delta,
      pressure: force.pressure,
      viscous: force.viscous,
    };
  });
  return [
    ...rows,
    {
      name: "Component sum",
      start: 0,
      end: total,
      delta: total,
      pressure: data.reduce((s, d) => s + d.pressure, 0),
      viscous: data.reduce((s, d) => s + d.viscous, 0),
    },
  ];
}
