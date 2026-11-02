"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getAnchorStatus, submitAnchor, verifyAnchor } from "@/lib/api";

export function TimestampControls({ id }: { id: string }) {
  const status = useQuery({ queryKey: ["anchor", id], queryFn: () => getAnchorStatus(id) });
  const submit = useMutation({
    mutationFn: () => submitAnchor(id),
    onSuccess: () => {
      verify.reset();
      void status.refetch();
    },
  });
  const verify = useMutation({ mutationFn: () => verifyAnchor(id) });
  return (
    <div className="space-y-2 border-t pt-3 text-xs">
      <h3 className="font-medium">Third-party timestamp</h3>
      <p className="leading-relaxed text-muted-foreground">
        Submit the seal’s SHA-256 hash to the FreeTSA authority. The prediction itself is not
        sent. A local seal time is not an independent timestamp.
      </p>
      {status.isPending ? (
        <p>Checking stored timestamps…</p>
      ) : status.isError ? (
        <p role="alert" className="text-destructive">
          {status.error.message}{" "}
          <Button size="sm" variant="link" onClick={() => void status.refetch()}>
            Retry
          </Button>
        </p>
      ) : (
        <>
          <p>
            {status.data.token_count
              ? `${status.data.token_count} stored timestamp response(s). Signature verification is required.`
              : "No timestamp response stored."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Submitting…" : "Request timestamp"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!status.data.token_count || !status.data.ca_configured || verify.isPending}
              onClick={() => verify.mutate()}
            >
              {verify.isPending ? "Verifying…" : "Verify latest response"}
            </Button>
          </div>
          {!status.data.ca_configured && (
            <p className="text-muted-foreground">
              Verification unavailable: configure DAEDALUS_TSA_CA_FILE on the server with the
              trusted authority CA bundle.
            </p>
          )}
        </>
      )}
      {submit.isError && (
        <p role="alert" className="text-destructive">
          Timestamp request failed: {submit.error.message}
        </p>
      )}
      {submit.data && (
        <p>
          Authority: {submit.data.tsa} · claimed time: {submit.data.gen_time}. Response received;
          signature has not yet been verified.
        </p>
      )}
      {verify.isError && (
        <p role="alert" className="text-destructive">
          Verification unavailable: {verify.error.message}
        </p>
      )}
      {verify.data && (
        <div role="status">
          <p>
            {verify.data.verified
              ? "Signature and seal digest verified against the configured CA bundle."
              : "Verification failed; do not treat this timestamp as verified."}
          </p>
          {verify.data.detail && (
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-muted-foreground">
              {verify.data.detail}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
