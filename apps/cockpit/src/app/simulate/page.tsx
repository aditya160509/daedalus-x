import { PendingWorkspace } from "@/components/shell/PendingWorkspace";

export const metadata = { title: "Simulate · Daedalus X" };

export default function Page() {
  return (
    <PendingWorkspace
      title="Simulate"
      summary="The Virtual Wind Tunnel shows pressure, streamlines, wake slices and component forces from real OpenFOAM runs. It appears once the CFD pipeline has produced an accepted run."
      needs={[
        { step: "P3-02", what: "OpenFOAM case template and first baseline run" },
        { step: "P3-03", what: "Grid study proving mesh accuracy" },
        { step: "P3-04", what: "Component forces and ParaView field export" },
      ]}
    />
  );
}
