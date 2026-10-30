import { PendingWorkspace } from "@/components/shell/PendingWorkspace";

export const metadata = { title: "Evidence · Daedalus X" };

export default function Page() {
  return (
    <PendingWorkspace
      title="Evidence"
      summary="Every number in Daedalus X traces back here to its raw source, model and decision."
      needs={[
        { step: "P1-02", what: "Evidence API over the append-only store" },
        { step: "P6-09", what: "Provenance chain, run browser and exports" },
      ]}
    />
  );
}
