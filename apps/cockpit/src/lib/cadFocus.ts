/** Named-part focus uses the saved design, never whichever car happens to be open. */
export function cadFocusHref(design: string, parts: readonly string[]): string {
  const query = new URLSearchParams({ design, focus: "1" });
  for (const part of new Set(parts)) query.append("part", part);
  return `/design?${query}#cad`;
}

export interface CadFocusReply {
  matched: string[];
  missing: string[];
}
export function focusCad(
  frame: HTMLIFrameElement,
  parts: readonly string[],
  signal: AbortSignal,
): Promise<CadFocusReply> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const send = () =>
      frame.contentWindow?.postMessage(
        { type: "daedalus:focus", part: parts, requestId },
        window.location.origin,
      );
    const finish = (error?: Error, result?: CadFocusReply) => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      signal.removeEventListener("abort", abort);
      if (result) resolve(result);
      else reject(error ?? new Error("CAD focus failed"));
    };
    const abort = () => finish(new Error("CAD focus cancelled"));
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !("type" in data)) return;
      if (data.type === "daedalus:ready") {
        send();
        return;
      }
      if (
        data.type !== "daedalus:focused" ||
        !("requestId" in data) ||
        data.requestId !== requestId
      )
        return;
      if ("error" in data && typeof data.error === "string") {
        finish(new Error(data.error));
        return;
      }
      if (
        !("matched" in data) ||
        !("missing" in data) ||
        !Array.isArray(data.matched) ||
        !Array.isArray(data.missing)
      )
        return;
      const matched = data.matched.filter((name): name is string => typeof name === "string");
      const missing = data.missing.filter((name): name is string => typeof name === "string");
      finish(undefined, { matched, missing });
    };
    const timer = setTimeout(
      () =>
        finish(new Error("CAD did not confirm the part focus. Retry when the model has loaded.")),
      60_000,
    );
    window.addEventListener("message", receive);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else send();
  });
}
