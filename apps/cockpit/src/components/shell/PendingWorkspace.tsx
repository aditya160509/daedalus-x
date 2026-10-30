import { CircleDashed } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui/primitives";

/** Honest state for a workspace whose backing pipeline is not built yet. No placeholder data. */
export function PendingWorkspace({
  title,
  summary,
  needs,
}: {
  title: string;
  summary: string;
  needs: ReadonlyArray<{ step: string; what: string }>;
}) {
  return (
    <div className="h-full p-3">
      <Panel title={title}>
        <EmptyState icon={<CircleDashed size={20} />} title="No records yet">
          <p>{summary}</p>
          <ul className="mt-4 space-y-1.5 text-left">
            {needs.map((n) => (
              <li key={n.step} className="flex gap-3">
                <span className="w-12 shrink-0 font-mono text-[10px] text-brand">{n.step}</span>
                <span>{n.what}</span>
              </li>
            ))}
          </ul>
        </EmptyState>
      </Panel>
    </div>
  );
}
