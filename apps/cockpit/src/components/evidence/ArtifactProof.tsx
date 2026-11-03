"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { verifyArtifact } from "@/lib/api";

const subscribeOrigin = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function ArtifactProof({
  artifactId,
  pinnedHash,
}: {
  artifactId: string;
  pinnedHash?: string;
}) {
  const proof = useQuery({
    queryKey: ["artifact-verification", artifactId],
    queryFn: () => verifyArtifact(artifactId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const origin = useSyncExternalStore(subscribeOrigin, browserOrigin, serverOrigin);
  const [message, setMessage] = useState("");
  const svg = useRef<SVGSVGElement>(null);
  const data = proof.data;
  const pinMismatch = !!(data && pinnedHash && data.expected_sha256 !== `sha256:${pinnedHash}`);
  const matches = !!data && data.status === "match" && !pinMismatch;
  const link =
    data && origin
      ? `${origin}/verify/${encodeURIComponent(artifactId)}?sha256=${pinnedHash ?? data.expected_sha256.replace("sha256:", "")}`
      : "";
  const saveQr = () => {
    if (!svg.current) return;
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg.current)], { type: "image/svg+xml" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${artifactId}-verification.svg`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto p-3 sm:p-6">
      <Panel
        title="Artifact verification"
        description="A current byte-integrity check against an immutable evidence record."
        actions={data && <ProvenanceBadge value={data.provenance} />}
        bodyClassName="space-y-4 p-4"
      >
        <p className="break-all font-mono text-xs">{artifactId}</p>
        {proof.isPending && <Skeleton className="h-52" />}
        {proof.isError && (
          <div role="alert" className="space-y-3 text-sm">
            <p>{proof.error.message}</p>
            <Button variant="outline" onClick={() => void proof.refetch()}>
              Retry verification
            </Button>
          </div>
        )}
        {data && (
          <>
            <p
              role="status"
              className={
                matches ? "text-sm font-medium text-ok" : "text-sm font-medium text-destructive"
              }
            >
              {pinMismatch
                ? "The record hash differs from the hash pinned in this link."
                : data.status === "missing"
                  ? "The recorded file is missing."
                  : matches
                    ? "Stored bytes match the recorded SHA-256."
                    : "Stored bytes do not match the recorded SHA-256."}
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-[9rem_1fr]">
              <dt className="text-muted-foreground">Artifact kind</dt>
              <dd className="break-all">{data.kind}</dd>
              <dt className="text-muted-foreground">Source record</dt>
              <dd className="break-all font-mono">{data.source_entity_id}</dd>
              <dt className="text-muted-foreground">Record created</dt>
              <dd>{data.created_at}</dd>
              <dt className="text-muted-foreground">File size</dt>
              <dd>
                {data.size_bytes === null
                  ? "Unavailable"
                  : `${data.size_bytes.toLocaleString()} bytes`}
              </dd>
              <dt className="text-muted-foreground">Recorded SHA-256</dt>
              <dd className="break-all font-mono">{data.expected_sha256}</dd>
              <dt className="text-muted-foreground">Computed SHA-256</dt>
              <dd className="break-all font-mono">{data.actual_sha256 ?? "Unavailable"}</dd>
              {pinnedHash && (
                <>
                  <dt className="text-muted-foreground">Pinned link SHA-256</dt>
                  <dd className="break-all font-mono">sha256:{pinnedHash}</dd>
                </>
              )}
            </dl>
            <p className="text-xs text-muted-foreground">
              Checked at {new Date(proof.dataUpdatedAt).toLocaleString()}. A matching hash
              establishes consistency with this server’s record. It does not independently prove
              authorship, submission time, measured provenance or scientific acceptance.
            </p>
            <Button
              variant="outline"
              disabled={proof.isFetching}
              onClick={() => void proof.refetch()}
            >
              {proof.isFetching ? "Checking bytes…" : "Check again"}
            </Button>
            {link && (
              <div className="space-y-3 border-t pt-4">
                <QRCodeSVG
                  ref={svg}
                  value={link}
                  size={224}
                  level="M"
                  marginSize={4}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  title="Hash-pinned artifact verification link"
                />
                <a href={link} className="block break-all font-mono text-xs underline">
                  {link}
                </a>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={saveQr}>
                    Download QR SVG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!navigator.clipboard) {
                        setMessage("Copy unavailable. Select the link above.");
                        return;
                      }
                      void navigator.clipboard.writeText(link).then(
                        () => setMessage("Link copied."),
                        () => setMessage("Copy unavailable. Select the link above."),
                      );
                    }}
                  >
                    Copy verification link
                  </Button>
                </div>
                {message && (
                  <p role="status" className="text-xs">
                    {message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The QR pins the expected digest. It works only where this app and its evidence
                  store are reachable; localhost links are not publicly hosted. No file contents are
                  exposed by this page.
                </p>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
