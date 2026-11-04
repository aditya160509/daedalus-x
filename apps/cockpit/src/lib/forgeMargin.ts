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

export interface MarginBand {
  rule_id: string;
  name: string;
  page: number;
  unit: string;
  /** Signed nearest-limit margin in the rule's own unit. */
  margin: number;
  /** Signed margin as a percentage of the allowed two-sided span. */
  pct: number;
  /** ±1σ declared manufacturing spread mapped into the same percentage. */
  band_low_pct: number;
  band_high_pct: number;
}

/**
 * A margin bar is only drawn when the limit is two-sided and a positive sigma is declared.
 * One-sided limits have no span denominator and manual rules have no CAD value, so both stay
 * explicitly unavailable rather than being plotted as zero margin.
 */
export function marginBand(
  check: Pick<RuleCheck, "rule_id" | "name" | "page" | "value" | "min" | "max" | "margin" | "unit">,
  sigma: number | null,
): MarginBand | null {
  const pct = normalisedHeadroom(check);
  if (pct == null || check.margin == null || check.min == null || check.max == null) return null;
  if (sigma == null || !Number.isFinite(sigma) || sigma <= 0) return null;
  const span = check.max - check.min;
  if (!(span > 0)) return null;
  const bandPct = (100 * sigma) / span;
  return {
    rule_id: check.rule_id,
    name: check.name,
    page: check.page,
    unit: check.unit,
    margin: check.margin,
    pct,
    band_low_pct: pct - bandPct,
    band_high_pct: pct + bandPct,
  };
}

export type RiskOrder = "expected" | "probability" | "rulebook";

export const RISK_ORDER_LABELS: Record<RiskOrder, string> = {
  expected: "Expected points at risk",
  probability: "Lowest pass probability",
  rulebook: "Rulebook order",
};

export const RISK_ORDER_OPTIONS: ReadonlyArray<{ value: RiskOrder; label: string }> = [
  { value: "expected", label: RISK_ORDER_LABELS.expected },
  { value: "probability", label: RISK_ORDER_LABELS.probability },
  { value: "rulebook", label: RISK_ORDER_LABELS.rulebook },
];

interface RiskOrderRow {
  expected_points_lost: number | null;
  pass_probability: number;
}

/**
 * Expected-loss ordering is only claimed where a stated penalty and a supported failure
 * probability both exist; unquantified rows sort after quantified ones. Equal expected loss is
 * broken by pass probability, and ties keep the rulebook order returned by the API.
 */
export function orderRiskRows<T extends RiskOrderRow>(rows: readonly T[], order: RiskOrder): T[] {
  if (order === "rulebook") return rows.slice();
  const indexed = rows.map((row) => ({ row }));
  indexed.sort((a, b) => {
    if (order === "expected") {
      const aPoints = a.row.expected_points_lost;
      const bPoints = b.row.expected_points_lost;
      if (aPoints == null && bPoints == null) return 0;
      if (aPoints == null) return 1;
      if (bPoints == null) return -1;
      if (aPoints !== bPoints) return bPoints - aPoints;
    }
    return a.row.pass_probability - b.row.pass_probability;
  });
  return indexed.map((entry) => entry.row);
}
