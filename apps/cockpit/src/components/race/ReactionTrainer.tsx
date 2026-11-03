"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { reactionStats, recordReaction, useReactionHistory } from "@/lib/reactionHistory";
import { ReactionHistory } from "./ReactionHistory";
import { cn } from "@/lib/utils";

type Phase = "idle" | "lights" | "go" | "done" | "jump";
/** F1 five-light start: lights on one per second, out after a random hold; react with R or a click. */
export function ReactionTrainer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lit, setLit] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const attempts = useReactionHistory();
  const [storageError, setStorageError] = useState(false);
  const phaseRef = useRef<Phase>("idle");
  const transition = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const outAt = useRef(0);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => timers.current.splice(0).forEach(clearTimeout), []);

  const start = useCallback(() => {
    clear();
    transition("lights");
    setLast(null);
    setLit(0);
    for (let i = 1; i <= 5; i++) timers.current.push(window.setTimeout(() => setLit(i), i * 1000));
    const hold = 5000 + 200 + Math.random() * 2800;
    timers.current.push(
      window.setTimeout(() => {
        setLit(0);
        transition("go");
        outAt.current = performance.now();
      }, hold),
    );
  }, [clear, transition]);

  const react = useCallback(() => {
    const current = phaseRef.current;
    if (current === "idle" || current === "done" || current === "jump") return start();
    if (current === "lights") {
      clear();
      setLit(0);
      setLast(null);
      setStorageError(!recordReaction("false_start", null));
      return transition("jump");
    }
    const ms = Math.round(performance.now() - outAt.current);
    setLast(ms);
    transition("done");
    setStorageError(!recordReaction("reaction", ms));
  }, [clear, start, transition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.code !== "KeyR" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        (e.target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable]")
      )
        return;
      e.preventDefault();
      react();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [react]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        clear();
        setLit(0);
        transition("idle");
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", pause);
    };
  }, [clear, transition]);

  const stats = reactionStats(attempts);
  const best = stats.best;
  const avg = stats.mean === null ? null : Math.round(stats.mean);

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
      {storageError && (
        <p role="status" className="mt-3 text-xs text-risk">
          Browser storage is unavailable; results remain in this session. Export them before
          leaving.
        </p>
      )}
      <ReactionHistory attempts={attempts} />
    </Panel>
  );
}
