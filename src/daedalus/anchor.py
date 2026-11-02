"""Third-party timestamps for sealed predictions (T16, RFC 3161).

A sealed prediction carries its own `sealed_at` time, but that time is written by our own
software, so a judge has to trust us that it was really sealed before the race. An RFC 3161
timestamp authority (TSA) signs "this hash existed at this time" with its own key, which anyone
can check without trusting us.

Only the SHA-256 of the sealed manifest leaves the machine, never the prediction itself. The
TSA's reply is stored in the evidence store next to the prediction, and the full signature check
is the standard `openssl ts -verify` command that `verify_command` prints.
"""

from __future__ import annotations

import secrets
import shutil
import subprocess
import tempfile
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from daedalus import contracts as c
from daedalus import predictions
from daedalus.store import EvidenceStore, sha256_of

DEFAULT_TSA_URL = "https://freetsa.org/tsr"  # free public TSA; any RFC 3161 TSA works
TOKEN_KIND = "rfc3161_timestamp"  # noqa: S105 (an artifact kind, not a credential)
CA_BUNDLE_KIND = "rfc3161_ca_bundle"
SHA256_OID = bytes.fromhex("0609608648016503040201")  # DER OID 2.16.840.1.101.3.4.2.1
GRANTED = (0, 1)  # PKIStatus granted, grantedWithMods

Post = Callable[[str, bytes], bytes]


class AnchorError(ValueError):
    """Raised when a timestamp cannot be requested, or the reply does not match the request."""


def _der(tag: int, body: bytes) -> bytes:
    size = len(body)
    if size < 0x80:
        return bytes([tag, size]) + body
    raw = size.to_bytes((size.bit_length() + 7) // 8, "big")
    return bytes([tag, 0x80 | len(raw)]) + raw + body


def _der_integer(value: int) -> bytes:
    raw = value.to_bytes(max(1, (value.bit_length() + 8) // 8), "big", signed=True)
    return _der(0x02, raw)


def timestamp_request(digest: bytes, nonce: int) -> bytes:
    """DER TimeStampReq for a SHA-256 digest: version 1, the imprint, a nonce, certReq true."""
    if len(digest) != 32:
        raise AnchorError("digest must be 32 bytes of SHA-256")
    algorithm = _der(0x30, SHA256_OID + bytes([0x05, 0x00]))
    imprint = _der(0x30, algorithm + _der(0x04, digest))
    body = _der_integer(1) + imprint + _der_integer(nonce) + bytes([0x01, 0x01, 0xFF])
    return _der(0x30, body)


def _read(data: bytes, pos: int) -> tuple[int, int, int]:
    """Tag, start of content and end of content of the DER element at `pos`."""
    if pos + 2 > len(data):
        raise AnchorError("truncated DER")
    tag, first = data[pos], data[pos + 1]
    start = pos + 2
    if first < 0x80:
        length = first
    else:
        count = first & 0x7F
        length = int.from_bytes(data[start : start + count], "big")
        start += count
    end = start + length
    if end > len(data):
        raise AnchorError("truncated DER")
    return tag, start, end


def _generalized_times(data: bytes) -> list[str]:
    """Every DER GeneralizedTime in `data`, found by walking constructed elements."""
    found: list[str] = []

    def walk(pos: int, stop: int) -> None:
        while pos < stop:
            tag, start, end = _read(data, pos)
            if tag == 0x18:
                found.append(data[start:end].decode("ascii", errors="replace"))
            elif tag & 0x20 or tag == 0x04:  # constructed, or an OCTET STRING wrapping DER
                try:
                    walk(start, end)
                except AnchorError:
                    if tag & 0x20:
                        raise
            pos = end

    walk(0, len(data))
    return found


@dataclass(frozen=True)
class TimestampToken:
    status: int
    gen_time: str  # as the TSA wrote it, e.g. 20261102120000Z
    token_der: bytes
    tsa_url: str


def parse_response(response: bytes, digest: bytes, nonce: int, tsa_url: str) -> TimestampToken:
    """Check a TimeStampResp: granted, and its token carries our digest and nonce.

    This checks content, not the TSA's signature; `verify_command` gives the signature check.
    """
    tag, start, end = _read(response, 0)
    if tag != 0x30:
        raise AnchorError("timestamp reply is not a DER SEQUENCE")
    status_tag, status_start, status_end = _read(response, start)
    _, int_start, int_end = _read(response, status_start)
    status = int.from_bytes(response[int_start:int_end], "big")
    if status_tag != 0x30 or status not in GRANTED:
        raise AnchorError(f"the timestamp authority refused the request (status {status})")
    token = response[status_end:end]
    if not token:
        raise AnchorError("the reply has no timestamp token")
    if digest not in token:
        raise AnchorError("the token does not contain our hash")
    if _der_integer(nonce) not in token:
        raise AnchorError("the token does not echo our nonce")
    times = _generalized_times(token)
    if not times:
        raise AnchorError("the token has no time")
    return TimestampToken(status=status, gen_time=times[-1], token_der=token, tsa_url=tsa_url)


def _http_post(url: str, body: bytes) -> bytes:
    if not url.startswith("https://"):
        raise AnchorError("timestamp authority URL must use https")
    request = urllib.request.Request(  # noqa: S310 (https only, checked above)
        url, data=body, headers={"Content-Type": "application/timestamp-query"}
    )
    with urllib.request.urlopen(request, timeout=20) as reply:  # noqa: S310
        return bytes(reply.read())


def manifest_digest(store: EvidenceStore, prediction_id: str) -> bytes:
    """SHA-256 of the sealed manifest, after checking the seal is intact."""
    predictions.verify(store, prediction_id)
    pred = store.get(prediction_id, c.Prediction)
    if pred.manifest_hash is None or not pred.manifest_hash.startswith("sha256:"):
        raise AnchorError(f"{prediction_id} has no SHA-256 seal")
    return bytes.fromhex(pred.manifest_hash.removeprefix("sha256:"))


def anchor_prediction(
    store: EvidenceStore,
    prediction_id: str,
    *,
    tsa_url: str = DEFAULT_TSA_URL,
    post: Post | None = None,
) -> TimestampToken:
    """Get an RFC 3161 timestamp for a sealed prediction and keep the reply as evidence."""
    digest = manifest_digest(store, prediction_id)
    nonce = secrets.randbits(63)
    response = (post or _http_post)(tsa_url, timestamp_request(digest, nonce))
    token = parse_response(response, digest, nonce, tsa_url)
    store.put_artifact(
        response,
        kind=TOKEN_KIND,
        source_entity_id=prediction_id,
        provenance=c.Provenance.MEASURED,
    )
    return token


def verify_command(prediction_hash_hex: str, tsr_path: str, ca_path: str = "cacert.pem") -> str:
    """The openssl command a judge runs to check the TSA signature over our hash."""
    return f"openssl ts -verify -digest {prediction_hash_hex} -in {tsr_path} -CAfile {ca_path}"


def _tokens(store: EvidenceStore, prediction_id: str) -> list[c.Artifact]:
    return [
        a
        for a in store.records(c.Artifact)
        if a.kind == TOKEN_KIND and a.source_entity_id == prediction_id
    ]


def _ca_artifact(store: EvidenceStore, prediction_id: str, ca_bytes: bytes) -> c.Artifact:
    """One artifact record per distinct trust bundle, reused across verifications."""
    digest = sha256_of(ca_bytes)
    for art in store.records(c.Artifact):
        if art.kind == CA_BUNDLE_KIND and art.content_sha256 == digest:
            return art
    return store.put_artifact(
        ca_bytes,
        kind=CA_BUNDLE_KIND,
        source_entity_id=prediction_id,
        provenance=c.Provenance.MEASURED,
    )


def _default_runner(argv: list[str]) -> tuple[int, str, str]:
    result = subprocess.run(argv, capture_output=True, text=True, timeout=20, check=False)
    return result.returncode, result.stdout, result.stderr


def verify_stored_timestamp(
    store: EvidenceStore,
    prediction_id: str,
    ca_path: Path,
    *,
    openssl: str | None = None,
    runner: Callable[[list[str]], tuple[int, str, str]] | None = None,
) -> c.TimestampVerification:
    """Verify the newest stored response and record the verdict as append-only evidence.

    The record keeps the exact token artifact, the trust bundle artifact (reused by content
    hash, so the bytes a judge would use are recoverable) and the command that was run.
    """
    digest = manifest_digest(store, prediction_id)
    tokens = _tokens(store, prediction_id)
    if not tokens:
        raise AnchorError(f"no timestamp response is stored for {prediction_id}")
    token = tokens[-1]
    openssl = openssl if openssl is not None else shutil.which("openssl")
    if not openssl:
        raise AnchorError("OpenSSL is required for timestamp verification")
    ca_bytes = ca_path.read_bytes()
    ca = _ca_artifact(store, prediction_id, ca_bytes)

    with tempfile.TemporaryDirectory() as directory:
        token_path = Path(directory) / "response.tsr"
        token_path.write_bytes(store.read_artifact(token.artifact_id))
        ca_file = Path(directory) / "ca.pem"
        ca_file.write_bytes(ca_bytes)
        argv = [
            openssl,
            "ts",
            "-verify",
            "-digest",
            digest.hex(),
            "-in",
            str(token_path),
            "-CAfile",
            str(ca_file),
        ]
        code, out, err = (runner or _default_runner)(argv)
        version_code, version_out, _ = (runner or _default_runner)([openssl, "version"])

    detail = (err or out).strip()[:2000]
    times = _generalized_times(store.read_artifact(token.artifact_id))
    record = store.add(
        c.TimestampVerification(
            prediction_id=prediction_id,
            token_artifact_id=token.artifact_id,
            ca_artifact_id=ca.artifact_id,
            verified=code == 0,
            detail=detail,
            command=verify_command(
                digest.hex(),
                f"{prediction_id}-{token.artifact_id}.tsr",
                f"tsa-ca-{ca.content_sha256.removeprefix('sha256:')[:16]}.pem",
            ),
            openssl_version=version_out.strip()[:200] if version_code == 0 else None,
            gen_time=times[-1] if times else None,
        )
    )
    return record


def verification_history(store: EvidenceStore, prediction_id: str) -> list[c.TimestampVerification]:
    """Every recorded verification for a prediction, newest first."""
    return sorted(
        (v for v in store.records(c.TimestampVerification) if v.prediction_id == prediction_id),
        key=lambda v: (v.created_at, v.verification_id),
        reverse=True,
    )
