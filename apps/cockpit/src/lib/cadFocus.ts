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

export interface CadRule {
  part: string;
  state: "fail_cad" | "at_risk" | "pass_cad_only" | "manual_review";
  value: number | null;
  limit: number | null;
  unit: string;
  axis: "x" | "y" | "z" | null;
  name: string;
}

export interface CadRulesReply {
  coloured: string[];
  dimensions: number;
  missing: string[];
  unavailable: string[];
}

/** Push FORGE rule colours and value/limit dimensions into the embedded CAD overlay. */
export function applyCadRules(
  frame: HTMLIFrameElement,
  revision: string,
  rules: readonly CadRule[],
  signal: AbortSignal,
): Promise<CadRulesReply> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => finish(new Error("CAD did not answer the rule overlay")),
      20_000,
    );
    function finish(error?: Error, result?: CadRulesReply) {
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
      signal.removeEventListener("abort", abort);
      if (result) resolve(result);
      else reject(error ?? new Error("CAD rule overlay failed"));
    }
    function abort() {
      finish(new Error("CAD rule overlay cancelled"));
    }
    function receive(event: MessageEvent<unknown>) {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as {
        type?: string;
        revision?: string;
        error?: string;
        coloured?: string[];
        dimensions?: number;
        missing?: string[];
        unavailable?: string[];
      };
      if (data?.type !== "daedalus:rulesApplied" || data.revision !== revision) return;
      if (data.error) return finish(new Error(data.error));
      finish(undefined, {
        coloured: data.coloured ?? [],
        dimensions: data.dimensions ?? 0,
        missing: data.missing ?? [],
        unavailable: data.unavailable ?? [],
      });
    }
    window.addEventListener("message", receive);
    signal.addEventListener("abort", abort, { once: true });
    frame.contentWindow?.postMessage(
      { type: "daedalus:rules", revision, rules },
      window.location.origin,
    );
  });
}

/** Remove rule materials and dimension annotations from the embedded CAD. */
export function clearCadRules(frame: HTMLIFrameElement, revision: string): void {
  frame.contentWindow?.postMessage(
    { type: "daedalus:clearRules", revision },
    window.location.origin,
  );
}
