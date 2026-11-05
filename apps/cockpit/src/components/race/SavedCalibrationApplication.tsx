"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";
import {
  applyRaceCalibration,
  listCalibrationStudies,
  type RaceCalibrationApplication,
} from "@/lib/api";

export function SavedCalibrationApplication({
  massG,
  trackM,
  onApply,
}: {
  massG: number;
  trackM: number;
  onApply: (application: RaceCalibrationApplication) => void;
}) {
  const [id, setId] = useState("");
  const cache = useQueryClient();
  const studies = useQuery({ queryKey: ["calibration-studies"], queryFn: listCalibrationStudies });
  const apply = useMutation({
    mutationFn: (studyId: string) =>
      applyRaceCalibration(studyId, { mass_kg: massG / 1000, track_m: trackM }),
    onSuccess: (application) => {
      onApply(application);
      void cache.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
  return (
    <Panel
      title="Apply saved calibration to Race"
      actions={<ProvenanceBadge value="predicted" />}
      bodyClassName="space-y-2 p-3"
    >
      <p className="text-xs text-muted-foreground">
        Applies posterior medians, the saved thrust curve and air density in M2. Keeps the current
        mass and track ({massG} g, {trackM} m), and resets tether resistance to zero because the
        calibration omitted it. Joint posterior draws are not propagated by this action.
      </p>
      <label className="grid max-w-md gap-1 text-xs">
        Saved study
        <select
          className="h-8 rounded border bg-background px-2"
          value={id}
          onChange={(event) => {
            setId(event.target.value);
            apply.reset();
          }}
        >
          <option value="">Select study…</option>
          {studies.data
            ?.filter((study) => study.medians)
            .map((study) => (
              <option key={study.study_id} value={study.study_id}>
                {study.study_id} · {study.n_runs} timing runs
              </option>
            ))}
        </select>
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!id || apply.isPending}
        onClick={() => apply.mutate(id)}
      >
        {apply.isPending ? "Recording application…" : "Apply medians and record source"}
      </Button>
      {(studies.error ?? apply.error) && (
        <p role="alert" className="text-xs text-destructive">
          {(studies.error ?? apply.error)?.message}
        </p>
      )}
      {apply.data && (
        <p role="status" className="text-xs">
          Applied study {apply.data.study_id} · record {apply.data.artifact_id}.
        </p>
      )}
    </Panel>
  );
}
