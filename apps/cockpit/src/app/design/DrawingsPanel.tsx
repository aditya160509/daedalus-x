"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/primitives";

const ITEMS = [
  "Assembled car",
  "Exploded assembly and component key",
  "Virtual cargo and section",
  "Official India decal location",
  "Chamber depth and wall thickness",
  "Tether guides",
  "Wheels and section",
  "Front wheels and supports",
  "Rear wheels and supports",
  "Nose cone",
  "Front wing and surface boundary",
  "Rear wing and surface boundary",
  "Intended quality and finish",
];

export function DrawingsPanel({ design }: { design?: string }) {
  const [team, setTeam] = useState("Veloira");
  const [number, setNumber] = useState("");
  const [finish, setFinish] = useState("");
  const [decal, setDecal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const download = async () => {
    if (!design || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/drawings/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, team, number, finish, decal }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        throw new Error(
          body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
            ? body.detail
            : `Drawing export failed (${response.status})`,
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "engineeringdrawings.pdf";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export drawings");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto p-3">
      <Panel title="Engineering drawings · C2.10.6">
        <form
          className="space-y-5 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void download();
          }}
        >
          <p className="text-sm text-muted-foreground">
            A4 vector drawings from the selected STEP revision, with named components, sections and
            CAD dimensions. Missing geometry and annotations remain in a review register. Audit
            feature dimensions, tolerances and wing boundaries before submission.
          </p>
          {!design && <p className="text-sm">Select a saved car to export its drawings.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drawing-team">Team name</Label>
              <Input
                id="drawing-team"
                required
                maxLength={100}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawing-number">Official team number</Label>
              <Input
                id="drawing-number"
                required
                maxLength={30}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="drawing-decal">Decal dimensions and structural references</Label>
            <textarea
              id="drawing-decal"
              maxLength={4000}
              value={decal}
              onChange={(e) => setDecal(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-transparent p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            <p className="text-xs text-muted-foreground">
              Optional for a draft. Supply measured offsets from wheel centres or other named
              structural features.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="drawing-finish">Intended quality and finish</Label>
            <textarea
              id="drawing-finish"
              maxLength={4000}
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-transparent p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            <p className="text-xs text-muted-foreground">
              Describe materials, preparation and finish for individual parts and the assembled car.
            </p>
          </div>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              13 required contents items
            </summary>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
              {ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </details>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!design || busy}>
              <Download className="size-4" />
              {busy ? "Projecting STEP geometry…" : "Download A4 drawing pack"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Draft · engineering review required
            </span>
          </div>
          {busy && (
            <p role="status" className="text-xs text-muted-foreground">
              CAD edge projection can take a few minutes. Keep this page open.
            </p>
          )}
        </form>
      </Panel>
    </div>
  );
}
