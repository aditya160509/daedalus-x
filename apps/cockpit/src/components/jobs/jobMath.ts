/** Pure presentation helpers; progress is solver iterations, not estimated wall time. */
export function suggestRunId(design: string, speed: number, fidelity: string, existing: string[]) {
  const prefix = `${design}_${speed}ms_${fidelity}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 54);
  let i = 1;
  while (existing.includes(`${prefix}_${i}`)) i++;
  return `${prefix}_${i}`;
}
export function progressPercent(iteration: number | null, end: number | null) {
  return iteration != null && end != null && end > 0
    ? Math.max(0, Math.min(100, (iteration / end) * 100))
    : null;
}
export function elapsedSeconds(start: string | null, finish: string | null, now = Date.now()) {
  if (!start) return null;
  return Math.max(0, ((finish ? Date.parse(finish) : now) - Date.parse(start)) / 1000);
}
