import { PendingWorkspace } from "@/components/shell/PendingWorkspace";

export const metadata = { title: "Optimize · Daedalus X" };

export default function Page() {
  return (
    <PendingWorkspace
      title="Optimize"
      summary="ORACLE recommends the next most useful CFD experiment and compares itself against Latin-hypercube sampling on the same budget."
      needs={[
        { step: "P4-01", what: "Aerodynamic surrogate (Ax / BoTorch GP)" },
        { step: "P4-02", what: "Next-experiment recommendation with approval" },
        { step: "P4-03", what: "Budget-matched LHS benchmark" },
      ]}
    />
  );
}
