# ATLAS artifact verification and QR

Evidence timeline and lineage artifact details link to `/verify/[artifactId]` with a pinned SHA-256 query. The page compares the recorded digest with freshly streamed stored bytes and with the pinned link; missing file, corrupted bytes and changed record digest never show a successful match. Metadata only, no raw source contents. Native qrcode.react renders a black-on-white SVG with four-module quiet zone and exports it; the original pinned digest is retained even when a mismatch is found. Local links explicitly require a reachable app/evidence store and are not a public deployment claim.

EvidenceStore verify_all and single-artifact checks use hashlib.file_digest with bounded memory, avoiding full CAD/CFD byte buffers. Existing read_artifact remains unchanged for callers needing content. This is a code-level memory improvement, not a measured whole-app memory reduction. Page does not claim authorship, trusted submission time, physical provenance or scientific acceptance from a hash match.

qrcode.react 4.2.0 ISC notice and bundled Nayuki MIT licence inspected and retained. GitHub aggregate NOASSERTION was resolved from installed/pinned upstream notices; no handwritten QR encoder. Sources: https://github.com/zpao/qrcode.react (TinyFish) and pinned v4.2.0 bundled licence (gh). Next dynamic-route docs read locally; async params/searchParams used.

Grouped verification: 12 evidence API/store tests passed, including correct/corrupt/missing/non-artifact IDs and a guard that fails any Path.read_bytes call during verification. TypeScript, focused oxlint, Ruff and pyrefly pass. Browser, actual QR scan and public hosting checks remain open. No servers, CFD or heavy builds started.
