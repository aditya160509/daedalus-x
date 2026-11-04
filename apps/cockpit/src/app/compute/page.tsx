import { ComputeTable } from "@/components/compute/ComputeTable";

export const metadata = { title: "Compute · Daedalus X" };

export default function ComputePage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 overflow-auto p-4">
      <ComputeTable />
    </div>
  );
}
