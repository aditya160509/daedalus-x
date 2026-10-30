import { PendingWorkspace } from "@/components/shell/PendingWorkspace";

export const metadata = { title: "Inspect · Daedalus X" };

export default function Page() {
  return (
    <PendingWorkspace
      title="Inspect"
      summary="FORGE checks the car against sourced rules, keeping CAD-only checks distinct from measured results."
      needs={[
        { step: "P5-01", what: "Rulebook import, deterministic checks and measurement records" },
      ]}
    />
  );
}
