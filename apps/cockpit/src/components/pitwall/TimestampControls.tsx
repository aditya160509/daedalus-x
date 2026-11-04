"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getAnchorHistory, getAnchorStatus, submitAnchor, verifyAnchor } from "@/lib/api";

const short = (value: string) => value.replace(/^sha256:/, "").slice(0, 12);

function Verdict({ verified }: { verified: boolean }) {
  return (
    <span className={verified ? "font-medium text-emerald-500" : "font-medium text-destructive"}>
      {verified ? "verified" : "failed"}
    </span>
  );
}

export function TimestampControls({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["anchor", id], queryFn: () => getAnchorStatus(id) });
  const history = useQuery({
    queryKey: ["anchor-history", id],
    queryFn: () => getAnchorHistory(id),
  });
  const refresh = () => {
    void status.refetch();
    void history.refetch();
  };
  const submit = useMutation({
    mutationFn: () => submitAnchor(id),
    onSuccess: refresh,
  });
  const verify = useMutation({
    mutationFn: () => verifyAnchor(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["evidence"] });
      refresh();
    },
  });
  const entries = history.data?.verifications ?? [];
  const tokens = history.data?.tokens ?? [];
  return (
    <div className="space-y-2 border-t pt-3 text-xs">
      <h3 className="font-medium">Third-party timestamp</h3>
      <p className="leading-relaxed text-muted-foreground">
        Submit the seal&rsquo;s SHA-256 hash to the FreeTSA authority. The prediction itself is not
        sent. A local seal time is not an independent timestamp.
      </p>
      {status.isPending ? (
        <p>Checking stored timestamps…</p>
      ) : status.isError ? (
        <p role="alert" className="text-destructive">
          {status.error.message}{" "}
          <Button size="sm" variant="link" onClick={refresh}>
            Retry
          </Button>
        </p>
      ) : (
        <>
          <p className="tabular-nums">
            {status.data.token_count
              ? `${status.data.token_count} stored response(s) · ${status.data.verification_count} verification(s) recorded`
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
          {status.data.latest_verification && (
            <p className="text-muted-foreground">
              Latest recorded check: <Verdict verified={status.data.latest_verification.verified} />{" "}
              at {new Date(status.data.latest_verification.created_at).toLocaleString()}.
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
              ? "Signature and seal digest verified; the result is recorded as evidence."
              : "Verification failed and was recorded; do not treat this timestamp as verified."}
          </p>
          {verify.data.detail && (
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-muted-foreground">
              {verify.data.detail}
            </pre>
          )}
        </div>
      )}
      {history.isError && (
        <p role="alert" className="text-destructive">
          Verification history unavailable: {history.error.message}
        </p>
      )}
      {entries.length > 0 && (
        <section aria-label="Verification history" className="space-y-1">
          <h4 className="font-medium text-muted-foreground">Verification history</h4>
          <ul className="divide-y rounded-md border">
            {entries.map((entry) => (
              <li key={entry.verification_id} className="space-y-1 px-2 py-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Verdict verified={entry.verified} />
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  <div>
                    token {entry.token_artifact_id}
                    {entry.gen_time ? ` · TSA time ${entry.gen_time}` : ""}
                  </div>
                  <div>
                    ca {entry.ca_artifact_id}
                    {entry.openssl_version ? ` · ${entry.openssl_version}` : ""}
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-muted-foreground">
                    Command and output
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                    {entry.command}
                    {entry.detail ? `\n\n${entry.detail}` : ""}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
          {tokens.length > 0 && (
            <p className="font-mono text-[11px] text-muted-foreground">
              latest response {short(tokens[tokens.length - 1].content_sha256)} · {tokens.length}{" "}
              stored
            </p>
          )}
        </section>
      )}
    </div>
  );
}
