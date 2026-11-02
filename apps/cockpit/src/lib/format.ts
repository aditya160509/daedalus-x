/**
 * One place for the numbers the cockpit shows: a finite check, fixed digits and the
 * quantity-specific conversion. Units stay in the markup so values can sit in tables.
 */
export const EMPTY = "—";

export function fmt(value: number | null | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? EMPTY : value.toFixed(digits);
}

export function fmtSec(seconds: number | null | undefined, digits = 3): string {
  return fmt(seconds, digits);
}

export function fmtMs(seconds: number | null | undefined, digits = 1): string {
  return seconds == null || !Number.isFinite(seconds) ? EMPTY : fmt(seconds * 1000, digits);
}

export function fmtCm2(areaM2: number | null | undefined, digits = 2): string {
  return areaM2 == null || !Number.isFinite(areaM2) ? EMPTY : fmt(areaM2 * 1e4, digits);
}

export function fmtPct(fraction: number | null | undefined, digits = 0): string {
  return fraction == null || !Number.isFinite(fraction) ? EMPTY : fmt(fraction * 100, digits);
}

export function fmtCount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? EMPTY : value.toLocaleString("en-GB");
}
