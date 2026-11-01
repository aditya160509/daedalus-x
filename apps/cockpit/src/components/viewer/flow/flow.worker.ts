import { nearestDelta, packLines, type WorkerTask, type WorkerResult } from "./flowMath";
self.addEventListener("message", (event: MessageEvent<WorkerTask>) => {
  try {
    const task = event.data;
    const result: WorkerResult =
      task.kind === "lines"
        ? { kind: "lines", data: packLines(task.lines, task.density, task.white) }
        : { kind: "delta", data: nearestDelta(task.a, task.b) };
    const buffers =
      result.kind === "lines"
        ? [result.data.positions.buffer, result.data.colors.buffer, result.data.arcs.buffer]
        : [result.data.scalar.buffer];
    self.postMessage(result, {
      transfer: buffers.filter((b): b is ArrayBuffer => b instanceof ArrayBuffer),
    });
  } catch (error) {
    self.postMessage(
      {
        kind: "error",
        message: error instanceof Error ? error.message : "Flow worker failed",
      },
      { transfer: [] },
    );
  }
});
