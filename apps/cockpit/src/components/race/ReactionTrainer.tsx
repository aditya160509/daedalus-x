"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Phase = "idle" | "lights" | "go" | "done" | "jump";
const KEY = "daedalus:reaction-ms";

function load(): number[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

/** F1 five-light start: lights on one per second, out after a random hold; react with Space or a click. */
export function ReactionTrainer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lit, setLit] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [log, setLog] = useState<number[]>([]);
  const outAt = useRef(0);
  const timers = useRef<number[]>([]);

  const clear = () => timers.current.splice(0).forEach(clearTimeout);

  const start = () => {
    clear();
    setPhase("lights");
    setLit(0);
    for (let i = 1; i <= 5; i++) timers.current.push(window.setTimeout(() => setLit(i), i * 1000));
    const hold = 5000 + 200 + Math.random() * 2800;
    timers.current.push(
      window.setTimeout(() => {
        setLit(0);
        setPhase("go");
        outAt.current = performance.now();
      }, hold),
    );
  };

  const react = () => {
    if (phase === "idle" || phase === "done" || phase === "jump") return start();
    if (phase === "lights") {
      clear();
      setLit(0);
      return setPhase("jump");
    }
    const ms = Math.round(performance.now() - outAt.current);
    setLast(ms);
    setPhase("done");
    setLog((prev) => {
      const next = [...(prev.length ? prev : load()), ms].slice(-50);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyR" || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      react();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [react]);
  useEffect(() => clear, []);

  const best = log.length ? Math.min(...log) : null;
  const avg = log.length ? Math.round(log.reduce((a, b) => a + b, 0) / log.length) : null;
  const recent = log.slice(-20);
  const top = Math.max(400, ...recent);

  return (
    <Panel
      title="Reaction start"
      actions={<span className="text-[11px] text-muted-foreground">R</span>}
      bodyClassName="p-4"
    >
      <button
        type="button"
        onClick={react}
        aria-label="Reaction start: press to start, press again when the lights go out"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-black/40 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "size-6 rounded-full border border-white/10 transition-colors duration-75",
              lit >= i ? "bg-red-600 shadow-[0_0_14px_rgb(220_38_38)]" : "bg-white/5",
            )}
          />
        ))}
      </button>
      <div className="mt-3 flex items-baseline justify-between font-mono">
        <span
          className={cn("tabular text-[28px] leading-none", phase === "jump" && "text-destructive")}
        >
          {phase === "jump" ? "JUMP" : phase === "go" ? "GO" : last != null ? last : "—"}
          {phase === "done" && <span className="ml-1 text-sm text-muted-foreground">ms</span>}
        </span>
        <span className="text-right text-[11px] text-muted-foreground">
          best <span className="text-foreground">{best ?? "—"}</span> · avg{" "}
          <span className="text-foreground">{avg ?? "—"}</span>
        </span>
      </div>
      <div className="mt-3 flex h-10 items-end gap-0.5" aria-hidden>
        {recent.map((ms, i) => (
          <span
            key={`${i}-${ms}`}
            className={cn("flex-1 rounded-sm", ms === best ? "bg-[#a855f7]" : "bg-brand/60")}
            style={{ height: `${(ms / top) * 100}%` }}
          />
        ))}
      </div>
    </Panel>
  );
}
