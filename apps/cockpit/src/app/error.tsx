"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/** Route-level failure: say what to do, keep the error id copyable, offer retry. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const errorId = error.digest ?? error.message;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy = () => {
    navigator.clipboard
      .writeText(errorId)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        role="alert"
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border bg-card p-6 shadow-panel"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <h1 className="text-sm font-medium">This workspace stopped rendering</h1>
        </div>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {errorId}
          </code>
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Copy className="size-3.5" aria-hidden />
            {copied ? "Copied" : "Copy id"}
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => window.location.assign("/")}>Back to Pit Wall</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If it keeps failing, restart the API with <code>uv run daedalus-api</code> and reload.
        </p>
      </div>
    </div>
  );
}
