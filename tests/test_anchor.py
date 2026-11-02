"""RFC 3161 anchoring (T16). The timestamp authority is faked, so no network is used."""

from __future__ import annotations

from pathlib import Path

import pytest

from daedalus import anchor, predictions
from daedalus import contracts as c
from daedalus.anchor import AnchorError
from daedalus.store import EvidenceStore, sha256_of

GEN_TIME = b"20261102120000Z"


@pytest.fixture
def store(tmp_path: Path) -> EvidenceStore:
    return EvidenceStore(tmp_path / "ev")


def _seal(store: EvidenceStore) -> c.Prediction:
    p = store.add(c.Project(team="t", competition_class="reference"))
    d = store.add(
        c.Design(
            project_id=p.project_id,
            geometry_hash=sha256_of(b"g"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.SYNTHETIC,
        )
    )
    m = store.add(
        c.Model(
            kind="titan",
            training_data_hash=sha256_of(b"none"),
            config={"level": "M2"},
            domain="20 m track",
        )
    )

    def s(v: float) -> c.Quantity:
        return c.Quantity(value=v, unit="s")

    return predictions.seal(
        store,
        model_id=m.model_id,
        design_id=d.design_id,
        predicted=s(1.10),
        interval_low=s(1.05),
        interval_high=s(1.16),
        interval_level=0.9,
        in_domain=True,
        manifest={"cda_m2": 0.0015},
    )


def _imprint_and_nonce(request: bytes) -> tuple[bytes, bytes]:
    """Pull the digest and the DER nonce back out of our own request."""
    _, start, _end = anchor._read(request, 0)
    _, _v_start, v_end = anchor._read(request, start)  # version
    _, i_start, i_end = anchor._read(request, v_end)  # messageImprint
    _, _a_start, a_end = anchor._read(request, i_start)  # algorithm
    _, h_start, h_end = anchor._read(request, a_end)  # hashedMessage
    _, _n_start, n_end = anchor._read(request, i_end)
    nonce_der = request[i_end:n_end]
    return request[h_start:h_end], nonce_der


def fake_tsa(status: int = 0, tamper: bool = False, echo_nonce: bool = True) -> anchor.Post:
    def post(url: str, body: bytes) -> bytes:
        digest, nonce_der = _imprint_and_nonce(body)
        if tamper:
            digest = bytes(32)
        tst_info = anchor._der(
            0x30,
            anchor._der_integer(1)
            + anchor._der(0x30, anchor._der(0x04, digest))
            + (nonce_der if echo_nonce else anchor._der_integer(7))
            + anchor._der(0x18, GEN_TIME),
        )
        token = anchor._der(0x30, anchor._der(0x04, tst_info))
        status_info = anchor._der(0x30, anchor._der_integer(status))
        return anchor._der(0x30, status_info + (token if status in (0, 1) else b""))

    return post


def test_request_is_well_formed_der() -> None:
    request = anchor.timestamp_request(bytes(range(32)), nonce=12345)
    tag, _start, end = anchor._read(request, 0)
    assert tag == 0x30 and end == len(request)
    assert anchor.SHA256_OID in request
    assert bytes(range(32)) in request
    with pytest.raises(AnchorError):
        anchor.timestamp_request(b"short", nonce=1)


def test_long_lengths_round_trip() -> None:
    blob = anchor._der(0x04, bytes(300))
    tag, start, end = anchor._read(blob, 0)
    assert tag == 0x04 and end - start == 300 and end == len(blob)


def test_anchor_stores_the_token_and_reads_the_time(store: EvidenceStore) -> None:
    pred = _seal(store)
    token = anchor.anchor_prediction(store, pred.prediction_id, post=fake_tsa())
    assert token.gen_time == GEN_TIME.decode()
    assert token.status == 0
    kinds = [a.kind for a in store.records(c.Artifact) if a.source_entity_id == pred.prediction_id]
    assert anchor.TOKEN_KIND in kinds


def test_only_the_hash_is_sent(store: EvidenceStore) -> None:
    pred = _seal(store)
    sent: list[bytes] = []

    def spy(url: str, body: bytes) -> bytes:
        sent.append(body)
        return fake_tsa()(url, body)

    anchor.anchor_prediction(store, pred.prediction_id, post=spy)
    assert b"cda_m2" not in sent[0]
    assert anchor.manifest_digest(store, pred.prediction_id) in sent[0]


def test_refused_wrong_hash_and_missing_nonce_are_rejected(store: EvidenceStore) -> None:
    pred = _seal(store)
    with pytest.raises(AnchorError, match="refused"):
        anchor.anchor_prediction(store, pred.prediction_id, post=fake_tsa(status=2))
    with pytest.raises(AnchorError, match="hash"):
        anchor.anchor_prediction(store, pred.prediction_id, post=fake_tsa(tamper=True))
    with pytest.raises(AnchorError, match="nonce"):
        anchor.anchor_prediction(store, pred.prediction_id, post=fake_tsa(echo_nonce=False))


def test_plain_http_is_refused() -> None:
    with pytest.raises(AnchorError, match="https"):
        anchor._http_post("http://example.com/tsr", b"x")


def test_verify_command_names_the_hash() -> None:
    cmd = anchor.verify_command("ab" * 32, "token.tsr")
    assert cmd.startswith("openssl ts -verify") and "ab" * 32 in cmd


def test_timestamp_api_status_and_verify_untrusted_response(
    store: EvidenceStore, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from daedalus.api import analysis, engineering

    pred = _seal(store)
    monkeypatch.setattr(engineering, "data_root", lambda: store.root)
    monkeypatch.setattr(anchor, "_http_post", fake_tsa())
    monkeypatch.delenv("DAEDALUS_TSA_CA_FILE", raising=False)
    app = FastAPI()
    app.include_router(analysis.router)
    client = TestClient(app)
    base = f"/v1/analysis/predictions/{pred.prediction_id}/anchor"
    assert client.get(base).json() == {"token_count": 0, "ca_configured": False}
    assert client.post(base + "/verify").status_code == 503
    assert client.post(base).status_code == 200
    assert client.get(base).json()["token_count"] == 1
    ca = tmp_path / "ca.pem"
    ca.write_text("not a certificate")
    monkeypatch.setenv("DAEDALUS_TSA_CA_FILE", str(ca))
    result = client.post(base + "/verify")
    assert result.status_code == 200
    assert result.json()["verified"] is False
