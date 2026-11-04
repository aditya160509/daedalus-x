"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { applyCadRules, type CadRule, clearCadRules, focusCad } from "@/lib/cadFocus";

export interface FocusRequest {
  parts: string[];
  nonce: number;
}
export function CadFrame({
  src,
  active,
  request,
  frame,
  rules,
  revision,
}: {
  src: string;
  active: boolean;
  request: FocusRequest | null;
  frame: React.RefObject<HTMLIFrameElement | null>;
  rules: readonly CadRule[];
  revision: string;
}) {
  const completed = useRef("");
  const signature = request ? JSON.stringify(request) : "";
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!active || !signature || !frame.current || completed.current === signature) return;
    const controller = new AbortController();
    const parsed: FocusRequest = JSON.parse(signature);
    void focusCad(frame.current, parsed.parts, controller.signal)
      .then((result) => {
        completed.current = signature;
        if (result.missing.length)
          toast.warning("Some CAD parts were not found", {
            description: result.missing.join(", "),
          });
        else
          toast.success(
            parsed.parts.length
              ? `Selected ${result.matched.length} CAD parts`
              : "Framed the complete car",
          );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          toast.error("Could not focus CAD", {
            description: error instanceof Error ? error.message : "Unknown CAD error",
          });
      });
    return () => controller.abort();
  }, [active, signature, frame, src]);
  const rulesSignature = JSON.stringify(rules);
  useEffect(() => {
    if (!active || !loaded || !frame.current) return;
    if (!rules.length) {
      clearCadRules(frame.current, revision);
      return;
    }
    const controller = new AbortController();
    const parsed: CadRule[] = JSON.parse(rulesSignature);
    void applyCadRules(frame.current, revision, parsed, controller.signal).catch(
      (error: unknown) => {
        if (!controller.signal.aborted)
          toast.error("Could not apply CAD rule overlay", {
            description: error instanceof Error ? error.message : "Unknown CAD error",
          });
      },
    );
    return () => controller.abort();
  }, [active, loaded, rulesSignature, revision, frame]);

  // Same-origin first-party OCCT app needs IndexedDB and WASM.
  // oxlint-disable-next-line react/iframe-missing-sandbox
  return (
    <iframe
      ref={frame}
      title="CAD"
      src={src}
      onLoad={() => setLoaded(true)}
      className="size-full border-0"
    />
  );
}
