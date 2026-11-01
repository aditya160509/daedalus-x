"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { AeroMap, BenchmarkChart, cm2, ScoreGauge } from "@/components/pitwall/PitCharts";
import { SealedReveal } from "@/components/pitwall/SealedReveal";
import { HeroImage, useHeroRun } from "@/components/render/HeroRender";
import { getOracleState } from "@/lib/api";
import { cn } from "@/lib/utils";

export const OPEN_PRESENTER = "daedalus:open-presenter";

interface Slide {
  title: string;
  note: string;
  body: React.ReactNode;
}

function Big({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="tabular font-mono text-6xl leading-none">
        {value}
        {unit && <span className="ml-2 text-2xl text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && t.closest("input,textarea,select,[contenteditable]") !== null;

/** Competition Mode: the Pit Wall's live panels as full-screen slides. P opens, ←/→, N notes, Esc. */
export function Presenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const q = useQuery({
    queryKey: ["oracle"],
    queryFn: getOracleState,
    staleTime: 60_000,
    enabled: open,
  });
  const s = q.data;
  const heroRun = useHeroRun();

  const demo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const slides: Slide[] = [
    {
      title: "Daedalus X",
      note: "One claim: we predict our race time before racing, seal it, and score it in front of you.",
      body: (
        <div className="flex flex-col items-start gap-6">
          <div className="text-7xl font-semibold tracking-tight">
            Daedalus <span className="text-brand">X</span>
          </div>
          <div className="text-2xl text-muted-foreground">
            Veloira · autonomous race engineering
          </div>
        </div>
      ),
    },
    {
      title: "The car",
      note: "The score is where our best drag sits inside the explored design space.",
      body: s && (
        <div className="grid w-full max-w-6xl grid-cols-[320px_1fr] items-center gap-16">
          <div className="h-72">
            <ScoreGauge s={s} />
          </div>
          <div className="grid grid-cols-2 gap-12">
            <Big label="Drag area" value={cm2(s.best.cda_m2)} unit="cm²" />
            <Big label="Predicted race" value={s.best.race_time_s.toFixed(3)} unit="s" />
            <Big label="CFD runs" value={String(s.observations.length)} />
            <Big
              label="Next run gain"
              value={((s.best.race_time_s - s.next.race_time_s) * 1000).toFixed(1)}
              unit="ms"
            />
          </div>
        </div>
      ),
    },
    {
      title: "The flow",
      note: "Real CFD on our car: surface pressure (red pushes, blue sucks) and streamlines by speed.",
      body: heroRun && <HeroImage runId={heroRun} className="aspect-video w-full max-w-6xl" />,
    },
    {
      title: "Aero map",
      note: "Dots are tested designs; the star is where ORACLE says to test next.",
      body: s && (
        <div className="h-[60vh] w-full max-w-5xl">
          <AeroMap s={s} />
        </div>
      ),
    },
    {
      title: "ORACLE vs random",
      note: "Same run budget: ORACLE finds lower drag sooner than Latin-hypercube sampling.",
      body: s && (
        <div className="h-[55vh] w-full max-w-5xl">
          <BenchmarkChart s={s} />
        </div>
      ),
    },
    {
      title: "Legal",
      note: "Checked against the sourced rulebook with page numbers. Mass and tether are measured, never assumed.",
      body: (
        <div className="h-[60vh] w-full max-w-3xl [&>section]:h-full">
          <LegalPanel />
        </div>
      ),
    },
    {
      title: "Live demo",
      note: "Open a deep tool; P brings this deck back.",
      body: (
        <div className="grid grid-cols-3 gap-6">
          {[
            ["/simulate", "Wind Tunnel"],
            ["/design", "Design Studio"],
            ["/race", "Race"],
          ].map(([href, label]) => (
            <button
              key={href}
              type="button"
              onClick={() => demo(href)}
              className="rounded-2xl border bg-card px-10 py-8 text-2xl hover:bg-accent"
            >
              {label} →
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Sealed prediction",
      note: "Type the measured time and reveal. A miss is shown just as openly as a hit.",
      body: (
        <div className="w-full max-w-xl rounded-2xl border bg-card">
          <SealedReveal />
        </div>
      ),
    },
  ];
  const count = slides.length;

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setStart(Date.now());
      setNow(Date.now());
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) show();
    };
    window.addEventListener(OPEN_PRESENTER, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_PRESENTER, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(v + 1, count - 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
      else if (e.key === "n") setNotes((v) => !v);
      else if (e.key === "Escape") setOpen(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open, count]);

  if (!open) return null;
  const slide = slides[i];
  const secs = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Competition mode"
      className="fixed inset-0 z-[60] flex flex-col bg-background"
    >
      <div className="flex items-center gap-4 px-10 pt-8 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{slide.title}</span>
        <span className="tabular ml-auto font-mono">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
        >
          Esc
        </button>
      </div>
      <div
        key={i}
        className="flex min-h-0 flex-1 items-center justify-center px-16 duration-300 animate-in fade-in motion-reduce:animate-none"
      >
        {slide.body ?? <div className="text-muted-foreground">Loading…</div>}
      </div>
      {notes && (
        <div className="mx-10 mb-3 rounded-lg border bg-card px-4 py-3 text-base text-text-2">
          {slide.note}
        </div>
      )}
      <div className="flex justify-center gap-2 pb-6" aria-hidden>
        {slides.map((x, k) => (
          <span
            key={x.title}
            className={cn(
              "h-1.5 rounded-full transition-all",
              k === i ? "w-6 bg-brand" : "w-1.5 bg-white/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}
