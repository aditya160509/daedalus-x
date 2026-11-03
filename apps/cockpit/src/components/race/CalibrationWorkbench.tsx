"use client";

import { lazy, Suspense, useState } from "react";
import { SegmentedControl, Skeleton } from "@/components/ui/primitives";
import { CalibrationPanel } from "./CalibrationPanel";

const PairedTimingPanel = lazy(() =>
  import("./PairedTimingPanel").then((m) => ({ default: m.PairedTimingPanel })),
);

export function CalibrationWorkbench() {
  const [view, setView] = useState<"model" | "paired">("model");
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SegmentedControl
        label="Calibration analysis"
        value={view}
        onChange={setView}
        options={[
          { value: "model", label: "Model calibration" },
          { value: "paired", label: "Paired tests" },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<Skeleton className="h-72" />}>
          {view === "model" ? <CalibrationPanel /> : <PairedTimingPanel />}
        </Suspense>
      </div>
    </div>
  );
}
