"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { physicalReadingSubjects, savePhysicalReading } from "@/lib/api";

const READINGS = [
  ["part_mass", "Part mass", "g"],
  ["caliper_dimension", "Caliper dimension", "mm"],
  ["coast_down_speed", "Coast-down start speed", "m/s"],
  ["coast_down_distance", "Coast-down stopping distance", "m"],
  ["tether_force", "Tether force", "N"],
  ["load_test_force", "Load-test force", "N"],
  ["load_test_deflection", "Load-test deflection", "mm"],
] as const;

export function PhysicalReadings() {
  const subjects = useQuery({
    queryKey: ["physical-reading-subjects"],
    queryFn: physicalReadingSubjects,
  });
  const save = useMutation({ mutationFn: savePhysicalReading });
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<string>(READINGS[0][0]);
  const [reading, setReading] = useState("");
  const [source, setSource] = useState("");
  const unit = READINGS.find(([id]) => id === kind)?.[2];

  return (
    <Panel
      title="Record a physical measurement"
      actions={<ProvenanceBadge value="measured" />}
      description="Save a raw reading against a registered design or build. Use the same test identifier for readings from the same run."
      bodyClassName="p-4"
    >
      {subjects.error && (
        <p role="alert" className="text-xs text-destructive">
          {subjects.error.message}
        </p>
      )}
      {subjects.isPending && (
        <p className="text-xs text-muted-foreground">Loading measurement subjects…</p>
      )}
      {subjects.data?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Import a design to register a measurement subject.
        </p>
      )}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ subject_id: subject, kind, reading: Number(reading), source });
        }}
      >
        <label className="grid gap-1 text-xs">
          Design or build
          <select
            className="h-9 rounded border bg-background px-2"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          >
            <option value="">Select…</option>
            {subjects.data?.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Reading type
          <select
            className="h-9 rounded border bg-background px-2"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              setReading("");
            }}
          >
            {READINGS.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="physical-value" className="grid gap-1 text-xs">
          Value ({unit})
          <Input
            id="physical-value"
            type="number"
            min={0}
            step="any"
            value={reading}
            required
            onChange={(event) => setReading(event.target.value)}
          />
        </label>
        <label htmlFor="physical-source" className="grid gap-1 text-xs">
          Part or test ID and instrument
          <Input
            id="physical-source"
            value={source}
            required
            maxLength={300}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={!subject || !source.trim() || save.isPending}>
          {save.isPending ? "Saving…" : "Save reading"}
        </Button>
        {save.error && (
          <p role="alert" className="text-xs text-destructive">
            {save.error.message}
          </p>
        )}
        {save.data && (
          <p role="status" className="break-all text-xs">
            Saved {save.data.observation_id}
          </p>
        )}
      </form>
    </Panel>
  );
}
