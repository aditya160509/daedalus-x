"use client";

import { useSyncExternalStore } from "react";

/** The CFD run chosen in the header picker, shared by every workspace. Stored in this browser. */
const KEY = "daedalus:cfd-run";
const listeners = new Set<() => void>();

function readRun(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function setSelectedRun(runId: string) {
  try {
    window.localStorage.setItem(KEY, runId);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  listeners.forEach((listener) => listener());
}

export function useSelectedRun(): [string | null, (runId: string) => void] {
  const runId = useSyncExternalStore(subscribe, readRun, () => null);
  return [runId, setSelectedRun];
}
