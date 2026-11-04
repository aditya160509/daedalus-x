"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { AeroMap, BenchmarkChart, cm2 } from "@/components/pitwall/PitCharts";
import { SealedReveal } from "@/components/pitwall/SealedReveal";
import { HeroImage, useHeroRun } from "@/components/render/HeroRender";
import { getDossier, getOracleState, listCfdRuns } from "@/lib/api";
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
  const runs = useQuery({
    queryKey: ["cfd-runs"],
    queryFn: listCfdRuns,
    staleTime: 60_000,
    enabled: open,
  });
  const dossier = useQuery({
    queryKey: ["vv-dossier"],
    queryFn: getDossier,
    staleTime: 30_000,
    enabled: open,
  });
  const heroSummary = runs.data?.find((run) => run.run_id === heroRun);
  const checkStatus = (id: string) => {
    const check = dossier.data?.checks.find((item) => item.requirement_id === id);
    return check ? check.status.replaceAll("_", " ") : "checking source status…";
  };
  const benchmarkTitle = s?.benchmark ? "GP/EI vs Latin hypercube" : "Benchmark unavailable";
  const flowNote = heroRun
    ? `Simulated steady-flow field from CFD run ${heroRun} (acceptance: ${heroSummary?.acceptance ?? "not recorded"}). It is not a measured flow or an independently accepted current-car result.`
    : "No solved CFD run with flow data is available. No flow result is claimed.";

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
      note:
        s?.provenance === "synthetic"
          ? "The lowest stored ORACLE observation is currently a synthetic seed target, not a measured drag value. The race time is a lumped-parameter prediction using an assumed 8 g thrust curve."
          : "The lowest stored ORACLE observation and the race time it implies. Stored provenance is mixed; check each observation before calling it measured.",
      body: s && (
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-2 gap-12">
            <Big label="Lowest stored CdA" value={cm2(s.best.cda_m2)} unit="cm²" />
            <Big label="Model race time" value={s.best.race_time_s.toFixed(3)} unit="s" />
            <Big label="ORACLE observations" value={String(s.observations.length)} />
            <Big
              label="Next-point model gain"
              value={((s.best.race_time_s - s.next.race_time_s) * 1000).toFixed(1)}
              unit="ms"
            />
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Observation source: {s.provenance === "synthetic" ? "synthetic seed targets" : "mixed"}.
            The next-point gain is a GP prediction, not a measured result. No accepted current-car
            CFD drag value is implied.
          </p>
        </div>
      ),
    },
    {
      title: "The flow",
      note: flowNote,
      body: heroRun ? (
        <figure className="w-full max-w-6xl">
          <HeroImage runId={heroRun} className="aspect-video w-full" />
          <figcaption className="mt-2 text-sm text-muted-foreground">
            Simulated CFD flow field · run {heroRun} · acceptance{" "}
            {heroSummary?.acceptance ?? "not recorded"}. Surface Cp and streamtubes are solver
            output, not measured pressure or a validated current-car result.
          </figcaption>
        </figure>
      ) : (
        <div className="max-w-2xl rounded-2xl border bg-card p-8 text-center">
          <p className="text-lg font-medium">No flow source available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {runs.isPending
              ? "Loading the CFD run list…"
              : runs.isError
                ? `Could not load CFD runs: ${runs.error.message}`
                : "No solved run with flow data is stored. The deck does not show a substitute image."}
          </p>
        </div>
      ),
    },
    {
      title: "Aero map",
      note: `GP posterior mean over the first two design variables, fitted to ${s?.observations.length ?? "the stored"} observations (${s?.provenance ?? "source loading"}). Dots are stored observations projected onto this slice; the star is the model's next proposal. The map is not measured CFD and carries no accepted-source claim.`,
      body: s && (
        <div className="h-[60vh] w-full max-w-5xl">
          <AeroMap s={s} />
        </div>
      ),
    },
    {
      title: benchmarkTitle,
      note: s?.benchmark
        ? "Completed registered equal-budget study on synthetic objectives: best-of-run CdA for GP with expected improvement versus Latin hypercube. This shows optimiser behaviour on synthetic data, not CFD or physical validation."
        : "No completed registered benchmark is stored, so no optimiser winner is claimed. Register an equal-budget synthetic study in Pit Wall → ORACLE → Benchmark to populate this slide.",
      body: s && (
        <div className="h-[55vh] w-full max-w-5xl">
          <BenchmarkChart s={s} />
        </div>
      ),
    },
    {
      title: "Legal",
      note: "CAD-only rule checks against the sourced rulebook with page numbers. Unmeasurable rules stay in manual review, and points at risk are rulebook penalties, not a prediction of the race result.",
      body: (
        <div className="h-[60vh] w-full max-w-3xl [&>section]:h-full">
          <LegalPanel />
        </div>
      ),
    },
    {
      title: "What is still unverified",
      note: "Built software is not evidence. This slide separates what the app can show from what has not been measured. The static QA and checkpoint facts are dated 2026-11-04; live dossier statuses refresh when the deck opens.",
      body: (
        <div className="grid w-full max-w-6xl gap-3 sm:grid-cols-2">
          {[
            {
              label: "ORACLE observations",
              value:
                s?.provenance === "synthetic"
                  ? "Synthetic seed targets"
                  : s
                    ? "Mixed; inspect each observation"
                    : "Source status unavailable",
              detail: "No accepted current-car drag campaign supplies these targets yet.",
            },
            {
              label: "Accepted CFD / grid study",
              value: checkStatus("V&V-03"),
              detail: "No accepted current-car 3-mesh GCI study is established by this deck.",
            },
            {
              label: "Measured race validation",
              value: checkStatus("V&V-05"),
              detail: "No independent measured race run scores the model out of sample here.",
            },
            {
              label: "Materials and beam model",
              value: "Handbook estimates",
              detail:
                "Euler–Bernoulli cantilever simplification; print anisotropy, joints and shear failure are not modelled.",
            },
            {
              label: "Physical GPU and final QA",
              value: "Pending (checkpoint 2026-11-04)",
              detail:
                "60 fps on the physical GPU and the final 1440/1024/375 px acceptance pass are not established.",
            },
            {
              label: "Evidence rule",
              value: "A hash proves integrity, not physics",
              detail:
                "Missing measurements stay missing; no slide upgrades a synthetic or CAD-only result to measured.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-lg font-medium capitalize">{item.value}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.detail}
              </div>
            </div>
          ))}
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
