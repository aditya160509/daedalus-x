/** Route transition skeleton: header strip plus two panel-shaped blocks. */
export default function Loading() {
  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-3"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="h-11 shrink-0 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="animate-pulse rounded-lg bg-surface-2" />
        <div className="animate-pulse rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}
