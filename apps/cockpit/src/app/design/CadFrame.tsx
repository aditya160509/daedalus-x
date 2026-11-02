"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { focusCad } from "@/lib/cadFocus";

export interface FocusRequest {
  parts: string[];
  nonce: number;
}
export function CadFrame({
  src,
  active,
  request,
  frame,
}: {
  src: string;
  active: boolean;
  request: FocusRequest | null;
  frame: React.RefObject<HTMLIFrameElement | null>;
}) {
  const completed = useRef("");
  const signature = request ? JSON.stringify(request) : "";
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
  // Same-origin first-party OCCT app needs IndexedDB and WASM.
  // oxlint-disable-next-line react/iframe-missing-sandbox
  return <iframe ref={frame} title="CAD" src={src} className="size-full border-0" />;
}
