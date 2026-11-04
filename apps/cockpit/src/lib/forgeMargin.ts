import type { RuleCheck } from "@/lib/api";

/**
 * Signed nearest-limit margin as a percentage of the allowed two-sided span. Only finite,
 * two-sided limits with a positive span and a computed margin are comparable this way.
 */
export function normalisedHeadroom(
  check: Pick<RuleCheck, "value" | "min" | "max" | "margin">,
): number | null {
  const { value, min, max, margin } = check;
  if (value == null || margin == null || min == null || max == null) return null;
  if (![value, min, max, margin].every(Number.isFinite)) return null;
  const span = max - min;
  if (!(span > 0)) return null;
  return (100 * margin) / span;
}

/** A short label that keeps the denominator explicit and never invents a percentage. */
export function headroomLabel(check: Pick<RuleCheck, "value" | "min" | "max" | "margin">): string {
  const pct = normalisedHeadroom(check);
  return pct == null ? "not applicable" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% of allowed span`;
}
