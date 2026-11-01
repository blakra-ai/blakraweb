from __future__ import annotations

import hashlib
import hmac
import time
from collections.abc import Iterator
from datetime import timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from blakrasocial.container import Container
from blakrasocial.domain.validation import default_registry
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.ayrshare import AyrshareWebhookParser, AyrshareWebhookVerifier
from blakrasocial.infrastructure.idempotency import InMemoryIdempotencyStore
from blakrasocial.infrastructure.security import HmacMediaSigner, JwtCallerAuthenticator, ServiceKeyVerifier
from blakrasocial.infrastructure.settings import Settings
from blakrasocial.main import create_app
from tests.fakes import NOW, FakeInspector, FakeMessenger, FakePublisher, FixedClock, RecordingSink, account

JWT_SECRET = "j" * 40
SERVICE_KEY = "k" * 40
WEBHOOK_SECRET = "w" * 40
PROFILE = "pk_customer_0001"
VIDEO_URL = "https://media.example.com/clip.mp4"


def settings() -> Settings:
    return Settings(
        environment="test",
        ayrshare_api_key="test",  # type: ignore[arg-type]
        auth_jwt_secret=JWT_SECRET,  # type: ignore[arg-type]
        auth_jwt_algorithms=["HS256"],
        auth_jwt_issuer="https://host.example",
        auth_jwt_audience="blakrasocial",
        media_signing_secret="m" * 40,  # type: ignore[arg-type]
        service_api_keys=[SERVICE_KEY],  # type: ignore[list-item]
        cors_allowed_origins=["https://app.blakra.com"],
        ayrshare_webhook_secret=WEBHOOK_SECRET,  # type: ignore[arg-type]
    )


class Harness:
    def __init__(self) -> None:
        from blakrasocial.domain.enums import Platform

        self.clock = FixedClock(NOW)
        self.publisher = FakePublisher(accounts=[account(Platform.INSTAGRAM, "business"), account(Platform.TIKTOK)])
        self.sink = RecordingSink()
        self.signer = HmacMediaSigner("m" * 40, now=self.clock.now)

    def container(self, s: Settings) -> Container:
        return Container(
            settings=s,
            publisher=self.publisher,
            messenger=FakeMessenger(),
            rules=default_registry(),
            inspector=FakeInspector(),
            signer=self.signer,
            idempotency=InMemoryIdempotencyStore(),
            clock=self.clock,
            authenticator=JwtCallerAuthenticator(
                issuer="https://host.example", audience="blakrasocial", algorithms=["HS256"], secret=JWT_SECRET
            ),
            service_keys=ServiceKeyVerifier([SERVICE_KEY]),
            webhook_verifier=AyrshareWebhookVerifier(WEBHOOK_SECRET),
            webhook_parser=AyrshareWebhookParser(),
            event_sink=self.sink,
        )


@pytest.fixture
def harness() -> Harness:
    return Harness()


@pytest.fixture
def client(harness: Harness) -> Iterator[TestClient]:
    with TestClient(create_app(settings(), harness.container)) as test_client:
        yield test_client


def auth(profile: str = PROFILE, header_profile: str | None = None) -> dict[str, str]:
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": "u1",
            "iss": "https://host.example",
            "aud": "blakrasocial",
            "iat": now,
            "exp": now + 300,
            "profile_key": profile,
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}", "X-Profile-Key": header_profile or profile}


def media_ref(harness: Harness) -> dict[str, str]:
    token = harness.signer.sign(ProfileKey(PROFILE), VIDEO_URL, "video/mp4", NOW + timedelta(days=10))
    return {"url": VIDEO_URL, "token": token}


def test_health_and_security_headers(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-Id": "abc-123"})
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-Id"] == "abc-123"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_platform_rules_are_public(client: TestClient) -> None:
    body = client.get("/platforms/rules").json()
    instagram = next(p for p in body["platforms"] if p["platform"] == "instagram")
    reel = next(c for c in instagram["contentTypes"] if c["contentType"] == "reel")
    assert reel["media"][0]["aspectRatios"] == ["9:16"]


def test_requires_bearer_token(client: TestClient) -> None:
    response = client.get("/accounts")
    assert response.status_code == 401
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["type"].endswith("/unauthorized")


def test_profile_header_must_match_token(client: TestClient) -> None:
    response = client.get("/accounts", headers=auth(header_profile="pk_someone_else"))
    assert response.status_code == 403


def test_list_accounts(client: TestClient) -> None:
    response = client.get("/accounts", headers=auth())
    assert response.status_code == 200
    assert [a["platform"] for a in response.json()["accounts"]] == ["instagram", "tiktok"]
    assert "displayName" in response.json()["accounts"][0]


def test_create_profile_requires_service_key(client: TestClient) -> None:
    assert client.post("/profiles", json={"title": "Acme"}).status_code == 401
    response = client.post("/profiles", json={"title": "Acme"}, headers={"X-Service-Key": SERVICE_KEY})
    assert response.status_code == 201
    assert response.json()["profileKey"].startswith("pk_acme")


def test_connect_url_rejects_unknown_redirect(client: TestClient) -> None:
    assert client.get("/accounts/connect-url", headers=auth()).status_code == 200
    bad = client.get("/accounts/connect-url", params={"redirectUrl": "https://evil.example"}, headers=auth())
    assert bad.status_code == 422


def test_upload_url_returns_signed_token(client: TestClient) -> None:
    response = client.post(
        "/media/upload-url",
        json={"fileName": "clip.mp4", "contentType": "video/mp4", "sizeBytes": 1000},
        headers=auth(),
    )
    assert response.status_code == 200
    assert {"uploadUrl", "accessUrl", "mediaToken", "mediaExpiresAt"} <= response.json().keys()


def test_publish_flow_with_idempotent_replay(client: TestClient, harness: Harness) -> None:
    body = {
        "caption": "Launch",
        "media": [media_ref(harness)],
        "targets": [
            {"platform": "instagram", "contentType": "reel", "options": {"shareReelsToFeed": True}},
            {"platform": "tiktok", "contentType": "video", "options": {"visibility": "public"}},
        ],
    }
    headers = auth() | {"Idempotency-Key": "c7d4f0a2-0000-4000-8000-000000000001"}
    first = client.post("/posts", json=body, headers=headers)
    assert first.status_code == 201, first.text
    assert first.json()["state"] == "published"
    second = client.post("/posts", json=body, headers=headers)
    assert second.headers["Idempotent-Replayed"] == "true"
    assert second.json()["id"] == first.json()["id"]
    assert len(harness.publisher.published) == 1


def test_publish_requires_idempotency_key(client: TestClient, harness: Harness) -> None:
    body = {"media": [media_ref(harness)], "targets": [{"platform": "tiktok", "contentType": "video"}]}
    response = client.post("/posts", json=body, headers=auth())
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "Idempotency-Key"


def test_validation_errors_are_problem_json(client: TestClient, harness: Harness) -> None:
    body = {
        "caption": "x" * 2300,
        "media": [media_ref(harness)],
        "targets": [{"platform": "whatsapp", "contentType": "story"}, {"platform": "tiktok", "contentType": "video"}],
    }
    response = client.post("/posts", json=body, headers=auth() | {"Idempotency-Key": "key-validation-1"})
    assert response.status_code == 422
    codes = {e["code"] for e in response.json()["errors"]}
    assert {"whatsapp_status_unsupported", "caption_too_long"} <= codes
    assert all(e["message"] for e in response.json()["errors"])


def test_unknown_fields_and_bad_platform_rejected(client: TestClient) -> None:
    body = {"targets": [{"platform": "myspace", "contentType": "post"}]}
    response = client.post("/posts", json=body, headers=auth() | {"Idempotency-Key": "key-validation-2"})
    assert response.status_code == 422


def test_get_and_delete_post(client: TestClient, harness: Harness) -> None:
    assert client.get("/posts/abc", headers=auth()).json()["id"] == "abc"
    assert client.get("/posts", headers=auth()).json()["total"] == 1
    assert client.delete("/posts/abc", headers=auth()).status_code == 204
    assert harness.publisher.deleted == ["abc"]
    assert client.delete("/accounts/tiktok", headers=auth()).status_code == 204


def test_webhook_signature(client: TestClient, harness: Harness) -> None:
    body = b'{"action":"scheduled","id":"p1","status":"success","postIds":[]}'
    sig = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    headers = {"X-Authorization-Timestamp": str(int(time.time())), "X-Authorization-Content-SHA256": sig}
    assert client.post("/webhooks/ayrshare", content=body, headers=headers).status_code == 204
    assert harness.sink.events[0].post_id == "p1"
    bad = client.post("/webhooks/ayrshare", content=body, headers=headers | {"X-Authorization-Content-SHA256": "0"})
    assert bad.status_code == 401


def test_cors_preflight_only_for_allowed_origin(client: TestClient) -> None:
    ok = client.options(
        "/accounts",
        headers={"Origin": "https://app.blakra.com", "Access-Control-Request-Method": "GET"},
    )
    assert ok.headers.get("access-control-allow-origin") == "https://app.blakra.com"
    denied = client.options(
        "/accounts",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in denied.headers


def test_settings_refuse_insecure_config() -> None:
    with pytest.raises(ValueError, match="AUTH_JWT_SECRET"):
        Settings(
            ayrshare_api_key="x",  # type: ignore[arg-type]
            auth_jwt_secret="short",  # type: ignore[arg-type]
            auth_jwt_algorithms=["HS256"],
            auth_jwt_issuer="i",
            auth_jwt_audience="a",
            media_signing_secret="m" * 40,  # type: ignore[arg-type]
        )
