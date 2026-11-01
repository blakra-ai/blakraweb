from __future__ import annotations

import hashlib
import hmac
import time
from datetime import timedelta

import jwt
import pytest

from blakrasocial.application.errors import InvalidSignature, MediaRejected, Unauthorized
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.ayrshare.webhooks import AyrshareWebhookParser, AyrshareWebhookVerifier
from blakrasocial.infrastructure.security import JwtCallerAuthenticator, ServiceKeyVerifier
from tests.fakes import NOW

SECRET = "s" * 40


def test_media_token_roundtrip_and_tamper(signer, profile, clock) -> None:  # type: ignore[no-untyped-def]
    token = signer.sign(profile, "https://m.example.com/a.mp4", "video/mp4", NOW + timedelta(days=1))
    assert signer.verify(profile, "https://m.example.com/a.mp4", token).content_type == "video/mp4"
    with pytest.raises(MediaRejected):
        signer.verify(profile, "https://m.example.com/b.mp4", token)
    with pytest.raises(MediaRejected):
        signer.verify(ProfileKey("pk_other_profile"), "https://m.example.com/a.mp4", token)
    with pytest.raises(MediaRejected):
        signer.verify(profile, "https://m.example.com/a.mp4", "garbage")
    clock.advance(timedelta(days=2))
    with pytest.raises(MediaRejected):
        signer.verify(profile, "https://m.example.com/a.mp4", token)


def _token(**overrides: object) -> str:
    claims: dict[str, object] = {
        "sub": "user-1",
        "iss": "https://host.example",
        "aud": "blakrasocial",
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,
        "profile_key": "pk_customer_0001",
    }
    claims.update(overrides)
    return jwt.encode(claims, SECRET, algorithm="HS256")


def _auth() -> JwtCallerAuthenticator:
    return JwtCallerAuthenticator(
        issuer="https://host.example", audience="blakrasocial", algorithms=["HS256"], secret=SECRET
    )


async def test_jwt_accepts_valid_token() -> None:
    identity = await _auth().authenticate(_token())
    assert identity.subject == "user-1"
    assert identity.profile_key == ProfileKey("pk_customer_0001")


@pytest.mark.parametrize(
    "token",
    [
        _token(exp=int(time.time()) - 3600),
        _token(aud="someone-else"),
        _token(iss="https://evil.example"),
        jwt.encode({"sub": "x"}, "wrong-secret-wrong-secret-wrong-secret", algorithm="HS256"),
        "not-a-jwt",
    ],
)
async def test_jwt_rejects_bad_tokens(token: str) -> None:
    with pytest.raises(Unauthorized):
        await _auth().authenticate(token)


async def test_jwt_rejects_alg_none() -> None:
    unsigned = jwt.encode({"sub": "x", "iss": "https://host.example", "aud": "blakrasocial"}, None, algorithm="none")
    with pytest.raises(Unauthorized):
        await _auth().authenticate(unsigned)


def test_service_keys() -> None:
    verifier = ServiceKeyVerifier(["k" * 40])
    verifier.verify("k" * 40)
    for bad in (None, "", "x" * 40):
        with pytest.raises(Unauthorized):
            verifier.verify(bad)


def _signed(body: bytes, secret: str = SECRET, ts: int | None = None) -> dict[str, str]:
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return {
        "X-Authorization-Timestamp": str(ts if ts is not None else int(time.time())),
        "X-Authorization-Content-SHA256-V2": f"v1={sig},v1=deadbeef",
    }


def test_webhook_verifier() -> None:
    verifier = AyrshareWebhookVerifier(SECRET)
    body = b'{"action":"scheduled","id":"p1","status":"success"}'
    verifier.verify(body, _signed(body))
    with pytest.raises(InvalidSignature):
        verifier.verify(body + b" ", _signed(body))
    with pytest.raises(InvalidSignature):
        verifier.verify(body, _signed(body, secret="other" * 10))
    with pytest.raises(InvalidSignature):
        verifier.verify(body, _signed(body, ts=int(time.time()) - 3600))
    with pytest.raises(InvalidSignature):
        AyrshareWebhookVerifier(None).verify(body, _signed(body))


def test_webhook_parser_only_handles_scheduled_action() -> None:
    parser = AyrshareWebhookParser()
    event = parser.parse(
        b'{"action":"scheduled","id":"p1","status":"error","postIds":[{"platform":"tiktok","status":"error"}]}'
    )
    assert event is not None and event.post_id == "p1" and not event.succeeded
    assert parser.parse(b'{"action":"social"}') is None
    assert parser.parse(b"not json") is None
