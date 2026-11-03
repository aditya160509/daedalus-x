import { notFound } from "next/navigation";
import { ArtifactProof } from "@/components/evidence/ArtifactProof";

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ artifactId: string }>;
  searchParams: Promise<{ sha256?: string }>;
}) {
  const { artifactId } = await params;
  const { sha256 } = await searchParams;
  if (
    !/^[a-z0-9_]{3,64}$/.test(artifactId) ||
    (sha256 !== undefined && (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)))
  )
    notFound();
  return <ArtifactProof artifactId={artifactId} pinnedHash={sha256} />;
}
