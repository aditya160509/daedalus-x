"use client";

import { useSyncExternalStore } from "react";

/** Per-browser settings. Nothing here leaves the machine. */
export interface Settings {
  /** Upper limit for the MPI ranks field in New run (the worker reserves two cores). */
  maxRanks: number;
}

const KEY = "daedalus:settings";
const DEFAULTS: Settings = { maxRanks: 8 };
const listeners = new Set<() => void>();

function parse(raw: string | null): Settings {
  if (!raw) return DEFAULTS;
  try {
    const value = JSON.parse(raw) as Partial<Settings>;
    const maxRanks = Number(value.maxRanks);
    return Number.isInteger(maxRanks) && maxRanks >= 1 && maxRanks <= 8
      ? { ...DEFAULTS, maxRanks }
      : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let cachedRaw: string | null | undefined;
let cachedValue = DEFAULTS;

// Snapshots must keep their identity between reads, or useSyncExternalStore loops.
function getSnapshot(): Settings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...getSnapshot(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the value applies until the page reloads.
    cachedRaw = undefined;
    cachedValue = next;
  }
  listeners.forEach((listener) => listener());
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
}
