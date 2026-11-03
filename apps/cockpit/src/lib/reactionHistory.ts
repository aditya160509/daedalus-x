"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

const KEY = "daedalus:reaction-history:v1";
const LEGACY = "daedalus:reaction-ms";
const EVENT = "daedalus:reaction-history-changed";
const EMPTY = "[]";
let memory: string | null = null;
export const RETAINED_ATTEMPTS = 500;
const Attempt = z
  .object({
    id: z.string(),
    at: z.string().nullable(),
    outcome: z.enum(["reaction", "false_start"]),
    ms: z.number().finite().nonnegative().nullable(),
  })
  .refine((a) => (a.outcome === "reaction" ? a.ms !== null : a.ms === null));
export type ReactionAttempt = z.infer<typeof Attempt>;

export function parseReactionHistory(raw: string): ReactionAttempt[] {
  try {
    const value: unknown = JSON.parse(raw);
    const current = z.array(Attempt).max(RETAINED_ATTEMPTS).safeParse(value);
    if (current.success) return current.data;
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)
    ) {
      return value
        .slice(-RETAINED_ATTEMPTS)
        .map((ms, i) => ({ id: `legacy_${i}`, at: null, outcome: "reaction", ms }));
    }
  } catch {
    /* Corrupt local history is not interpreted as a reaction time. */
  }
  return [];
}

function snapshot(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
export function useReactionHistory() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  return useMemo(() => parseReactionHistory(raw), [raw]);
}
export function recordReaction(outcome: ReactionAttempt["outcome"], ms: number | null): boolean {
  const attempt = Attempt.parse({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    outcome,
    ms,
  });
  const next = [...parseReactionHistory(snapshot()), attempt].slice(-RETAINED_ATTEMPTS);
  memory = JSON.stringify(next);
  let persisted = false;
  try {
    localStorage.setItem(KEY, memory);
    memory = null;
    persisted = true;
  } catch {
    /* Session copy remains usable when browser storage is blocked. */
  }
  window.dispatchEvent(new Event(EVENT));
  return persisted;
}

function quantile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * p,
    lo = Math.floor(index),
    hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}
export function reactionStats(attempts: ReactionAttempt[]) {
  const values = attempts
    .flatMap((a) => (a.outcome === "reaction" && a.ms !== null ? [a.ms] : []))
    .toSorted((a, b) => a - b);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const sd =
    values.length > 1 && mean !== null
      ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
      : null;
  const recorded = attempts.filter((a) => a.at !== null);
  return {
    count: values.length,
    best: values[0] ?? null,
    mean,
    median: quantile(values, 0.5),
    p10: quantile(values, 0.1),
    p90: quantile(values, 0.9),
    sd,
    falseStarts: recorded.filter((a) => a.outcome === "false_start").length,
    recordedAttempts: recorded.length,
    legacy: attempts.length - recorded.length,
  };
}
