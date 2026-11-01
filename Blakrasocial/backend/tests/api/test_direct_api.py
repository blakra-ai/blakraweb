"""HTTP surface of direct mode: connect URL per network, OAuth callback pages, WhatsApp setup."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import re
import time
from collections.abc import Iterator
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from fastapi.testclient import TestClient

from blakrasocial.application.ports.repositories import profile_id_of
from blakrasocial.container import AccountServices, Container, DirectServices
from blakrasocial.domain.entities import OAuthCredential, TikTokCreatorInfo
from blakrasocial.domain.enums import Platform, TikTokVisibility
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.accounts import (
    Argon2PasswordHasher,
    BuiltinTokenAuthenticator,
    CompositeAuthenticator,
    InMemoryLoginThrottle,
    JwtAccessTokenIssuer,
)
from blakrasocial.infrastructure.idempotency import InMemoryIdempotencyStore
from blakrasocial.infrastructure.networks.meta.signed_request import SignedRequestVerifier
from blakrasocial.infrastructure.persistence import (
    SqlDeletionReceiptRepository,
    SqlInviteRepository,
    SqlSessionRepository,
    SqlUserRepository,
    create_engine,
    session_factory,
)
from blakrasocial.infrastructure.persistence.models import Base
from blakrasocial.infrastructure.security import HmacMediaSigner, JwtCallerAuthenticator, ServiceKeyVerifier
from blakrasocial.main import create_app
from tests.api.test_api import JWT_SECRET, SERVICE_KEY, settings
from tests.direct_fakes import credential
from tests.fakes import FakeInspector, FakeMessenger, FixedClock, RecordingSink
from tests.integration.test_direct_mode import DB_URL, World


async def _reset() -> None:
    engine = create_engine(DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


META_SECRET = "fb-app-secret-for-tests"
SESSION_SECRET = "session-secret-for-tests-0123456789abcdef"


class FakeCreatorInfo:
    async def creator_info(self, credential: OAuthCredential) -> TikTokCreatorInfo:
        return TikTokCreatorInfo(
            nickname="Blakra",
            username="blakra",
            avatar_url=None,
            privacy_levels=(TikTokVisibility.PUBLIC, TikTokVisibility.PRIVATE),
            comment_disabled=False,
            duet_disabled=True,
            stitch_disabled=False,
            max_video_seconds=600,
        )


def signed_request(payload: dict[str, object], secret: str = META_SECRET) -> str:
    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    body = b64(json.dumps(payload).encode())
    return f"{b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())}.{body}"


class Holder:
    world: World


@pytest.fixture
def client() -> Iterator[tuple[TestClient, Holder]]:
    try:
        asyncio.run(_reset())
    except OSError:
        pytest.skip("PostgreSQL not reachable (set TEST_DATABASE_URL)")
    holder = Holder()

    def factory(s):  # type: ignore[no-untyped-def]
        from blakrasocial.domain.validation import default_registry
        from blakrasocial.infrastructure.ayrshare import AyrshareWebhookParser, AyrshareWebhookVerifier

        engine = create_engine(DB_URL)
        world = World(session_factory(engine), FixedClock())
        holder.world = world
        return Container(
            settings=s,
            publisher=world.publisher,
            messenger=FakeMessenger(),
            rules=default_registry(),
            inspector=FakeInspector(),
            signer=HmacMediaSigner("m" * 40, now=world.clock.now),
            idempotency=InMemoryIdempotencyStore(),
            clock=world.clock,
            authenticator=CompositeAuthenticator(
                BuiltinTokenAuthenticator(SESSION_SECRET),
                JwtCallerAuthenticator(
                    issuer="https://host.example", audience="blakrasocial", algorithms=["HS256"], secret=JWT_SECRET
                ),
            ),
            service_keys=ServiceKeyVerifier([SERVICE_KEY]),
            webhook_verifier=AyrshareWebhookVerifier(None),
            webhook_parser=AyrshareWebhookParser(),
            event_sink=RecordingSink(),
            closers=[engine],
            accounts=AccountServices(
                users=SqlUserRepository(session_factory(engine), world.cipher),
                sessions=SqlSessionRepository(session_factory(engine)),
                invites=SqlInviteRepository(session_factory(engine)),
                hasher=Argon2PasswordHasher(),
                throttle=InMemoryLoginThrottle(max_failures=3),
                issuer=JwtAccessTokenIssuer(SESSION_SECRET),
            ),
            direct=DirectServices(
                world.linker,
                world.profiles,
                world.credentials,
                runtime=None,  # type: ignore[arg-type]
                platforms=world.registry.platforms,
                creator_info=FakeCreatorInfo(),
                receipts=SqlDeletionReceiptRepository(session_factory(engine)),
                signed_requests={Platform.FACEBOOK: SignedRequestVerifier(META_SECRET)},
            ),
        )

    with TestClient(create_app(settings(), container_factory=factory)) as test_client:
        yield test_client, holder


def _auth(profile: str) -> dict[str, str]:
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": "u1",
            "iss": "https://host.example",
            "aud": "blakrasocial",
            "profile_key": profile,
            "iat": now,
            "exp": now + 300,
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}", "X-Profile-Key": profile}


def _profile(client: TestClient) -> str:
    created = client.post("/profiles", json={"title": "Shop"}, headers={"X-Service-Key": SERVICE_KEY})
    assert created.status_code == 201
    return str(created.json()["profileKey"])


def test_full_connect_round_trip(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    profile = _profile(http)
    started = http.get("/accounts/connect-url", params={"platform": "linkedin"}, headers=_auth(profile))
    assert started.status_code == 200
    url = urlparse(started.json()["url"])
    assert url.netloc == "auth.linkedin.test"
    state = parse_qs(url.query)["state"][0]

    page = http.get("/oauth/linkedin/callback", params={"code": "c1", "state": state})
    assert page.status_code == 200 and "LinkedIn" in page.text
    csp = page.headers["content-security-policy"]
    assert "default-src 'none'" in csp and "frame-ancestors 'none'" in csp
    nonce = re.search(r"'nonce-([^']+)'", csp)
    assert nonce and f'nonce="{nonce.group(1)}"' in page.text

    accounts = http.get("/accounts", headers=_auth(profile)).json()["accounts"]
    assert [a["platform"] for a in accounts] == ["linkedin"]

    replay = http.get("/oauth/linkedin/callback", params={"code": "c1", "state": state})
    assert replay.status_code == 400 and "expired" in replay.text


def test_callback_handles_denial_and_escapes_text(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    page = http.get(
        "/oauth/linkedin/callback",
        params={"error": "something", "error_description": "<script>alert(1)</script>"},
    )
    assert page.status_code == 400 and "<script>alert" not in page.text and "&lt;script&gt;" in page.text
    denied = http.get("/oauth/linkedin/callback", params={"error": "access_denied"})
    assert "not approved" in denied.text


def test_facebook_page_choice(client: tuple[TestClient, Holder]) -> None:
    http, holder = client
    holder.world.providers[Platform.FACEBOOK].results = [
        credential(Platform.FACEBOOK, "page-1"),
        credential(Platform.FACEBOOK, "page-2"),
    ]
    profile = _profile(http)
    url = http.get("/accounts/connect-url", params={"platform": "facebook"}, headers=_auth(profile)).json()["url"]
    state = parse_qs(urlparse(url).query)["state"][0]
    page = http.get("/oauth/facebook/callback", params={"code": "c", "state": state})
    token = re.search(r'name="token" value="([^"]+)"', page.text)
    assert token and 'action="/oauth/facebook/select"' in page.text
    chosen = http.post("/oauth/facebook/select", data={"token": token.group(1), "account_id": "page-2"})
    assert chosen.status_code == 200
    again = http.post("/oauth/facebook/select", data={"token": token.group(1), "account_id": "page-1"})
    assert again.status_code == 400


def test_connect_requires_platform_and_known_network(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    profile = _profile(http)
    missing = http.get("/accounts/connect-url", headers=_auth(profile))
    assert missing.status_code == 422
    unknown = http.get("/accounts/connect-url", params={"platform": "tiktok"}, headers=_auth(profile))
    assert unknown.status_code == 409 and unknown.json()["type"].endswith("not-configured")
    evil = http.get(
        "/accounts/connect-url",
        params={"platform": "linkedin", "redirectUrl": "https://evil.example/x"},
        headers=_auth(profile),
    )
    assert evil.status_code == 422


def test_whatsapp_setup_is_service_only_and_encrypted(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    profile = _profile(http)
    body = {
        "profileKey": profile,
        "phoneNumberId": "109555",
        "accessToken": "EAAG-secret-token",
        "displayName": "Blakra Support",
    }
    assert http.put("/profiles/whatsapp", json=body).status_code == 401
    ok = http.put("/profiles/whatsapp", json=body, headers={"X-Service-Key": SERVICE_KEY})
    assert ok.status_code == 204
    accounts = http.get("/accounts", headers=_auth(profile)).json()["accounts"]
    assert accounts[0]["platform"] == "whatsapp" and "EAAG" not in str(accounts)
    unknown = http.put(
        "/profiles/whatsapp", json={**body, "profileKey": "pk_unknown_profile"}, headers={"X-Service-Key": SERVICE_KEY}
    )
    assert unknown.status_code == 404


def test_rules_say_which_networks_can_be_connected(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    platforms = {p["platform"]: p["connectable"] for p in http.get("/platforms/rules").json()["platforms"]}
    assert platforms == {"instagram": False, "facebook": True, "tiktok": False, "linkedin": True, "whatsapp": False}


def test_meta_data_deletion_callback_erases_tokens_and_reports_status(client: tuple[TestClient, Holder]) -> None:
    http, holder = client
    profile = _profile(http)
    pid = profile_id_of(ProfileKey(profile))
    page = credential(Platform.FACEBOOK, "page-1", subject="fb-user-7")
    http.portal.call(holder.world.credentials.save, pid, page)

    forged = http.post(
        "/meta/facebook/data-deletion",
        data={"signed_request": signed_request({"algorithm": "HMAC-SHA256", "user_id": "fb-user-7"}, "wrong")},
    )
    assert forged.status_code == 401
    assert http.portal.call(holder.world.credentials.get, pid, Platform.FACEBOOK) is not None

    done = http.post(
        "/meta/facebook/data-deletion",
        data={"signed_request": signed_request({"algorithm": "HMAC-SHA256", "user_id": "fb-user-7"})},
    )
    assert done.status_code == 200
    body = done.json()
    assert set(body) == {"url", "confirmation_code"} and body["url"].endswith(
        f"/meta/deletion/{body['confirmation_code']}"
    )
    assert http.portal.call(holder.world.credentials.get, pid, Platform.FACEBOOK) is None

    status = http.get(f"/meta/deletion/{body['confirmation_code']}")
    assert status.status_code == 200 and body["confirmation_code"] in status.text and "deleted" in status.text
    assert http.get("/meta/deletion/unknowncode").status_code == 404
    assert http.post("/meta/instagram/deauthorize", data={"signed_request": "x.y"}).status_code == 409  # not set up


def test_tiktok_creator_info_endpoint(client: tuple[TestClient, Holder]) -> None:
    http, holder = client
    profile = _profile(http)
    assert http.get("/accounts/tiktok/creator-info", headers=_auth(profile)).status_code == 404
    pid = profile_id_of(ProfileKey(profile))
    http.portal.call(holder.world.credentials.save, pid, credential(Platform.TIKTOK, "open-1"))
    info = http.get("/accounts/tiktok/creator-info", headers=_auth(profile))
    assert info.status_code == 200 and info.headers["cache-control"] == "no-store"
    assert info.json() | {"avatarUrl": None} == {
        "nickname": "Blakra",
        "username": "blakra",
        "avatarUrl": None,
        "privacyLevels": ["public", "private"],
        "commentDisabled": False,
        "duetDisabled": True,
        "stitchDisabled": False,
        "maxVideoSeconds": 600,
        "canPost": True,
        "reason": None,
    }


CSRF = {"X-Requested-With": "blakrasocial"}


def _bearer(session: dict[str, object]) -> dict[str, str]:
    user = session["user"]
    assert isinstance(user, dict)
    return {"Authorization": f"Bearer {session['accessToken']}", "X-Profile-Key": str(user["profileKey"])}


def _token(link: str) -> str:
    assert "/invite#" in link
    return link.split("#", 1)[1]


def test_accounts_invite_sign_in_refresh_rotation_and_admin_rules(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    container = http.app.state.container  # type: ignore[attr-defined]
    owner = http.portal.call(container.bootstrap_admin().execute, "Owner@Blakra.com", "Blakra")
    token = owner.token

    info = http.get(f"/auth/invites/{token}").json()
    assert info == {"email": "owner@blakra.com", "title": "Blakra", "passwordSet": False}
    assert http.post(f"/auth/invites/{token}", json={"password": "Str0ng-pass!"}).status_code == 403  # no CSRF header
    weak = http.post(f"/auth/invites/{token}", json={"password": "short"}, headers=CSRF)
    assert weak.status_code == 422
    admin = http.post(f"/auth/invites/{token}", json={"password": "Str0ng-pass!"}, headers=CSRF)
    assert admin.status_code == 200 and admin.json()["user"]["role"] == "admin"
    assert "bs_session" in admin.cookies and "httponly" in admin.headers["set-cookie"].lower()
    assert http.post(f"/auth/invites/{token}", json={"password": "Str0ng-pass!"}, headers=CSRF).status_code == 404

    created = http.post(
        "/admin/users", json={"email": "cafe@example.com", "title": "Cafe"}, headers=_bearer(admin.json()) | CSRF
    )
    assert created.status_code == 201
    customer_link = created.json()["link"]
    dup = http.post(
        "/admin/users", json={"email": "CAFE@example.com", "title": "x"}, headers=_bearer(admin.json()) | CSRF
    )
    assert dup.status_code == 409

    http.cookies.clear()
    customer = http.post(f"/auth/invites/{_token(customer_link)}", json={"password": "Open-daily-24h!"}, headers=CSRF)
    assert customer.status_code == 200 and customer.json()["user"]["role"] == "customer"
    assert customer.json()["user"]["profileKey"] != admin.json()["user"]["profileKey"]
    assert http.get("/accounts", headers=_bearer(customer.json())).status_code == 200
    assert http.get("/admin/users", headers=_bearer(customer.json())).status_code == 403

    first_cookie = http.cookies.get("bs_session")
    rotated = http.post("/auth/refresh", headers=CSRF)
    assert rotated.status_code == 200 and http.cookies.get("bs_session") != first_cookie
    newest = http.cookies.get("bs_session")
    http.cookies.set("bs_session", first_cookie)  # replay of the old, already-rotated token
    assert http.post("/auth/refresh", headers=CSRF).status_code == 401
    http.cookies.set("bs_session", newest)
    assert http.post("/auth/refresh", headers=CSRF).status_code == 401  # whole sign-in was revoked

    users = http.get("/admin/users", headers=_bearer(admin.json())).json()["users"]
    cafe = next(u for u in users if u["email"] == "cafe@example.com")
    assert cafe["passwordSet"] is True
    off = http.post(f"/admin/users/{cafe['id']}/disable", headers=_bearer(admin.json()) | CSRF)
    assert off.status_code == 200 and off.json()["disabled"] is True
    login = http.post("/auth/login", json={"email": "cafe@example.com", "password": "Open-daily-24h!"}, headers=CSRF)
    assert login.status_code == 401
    me_off = http.post(f"/admin/users/{admin.json()['user']['id']}/disable", headers=_bearer(admin.json()) | CSRF)
    assert me_off.status_code == 403


def test_login_errors_are_generic_and_throttled(client: tuple[TestClient, Holder]) -> None:
    http, _ = client
    container = http.app.state.container  # type: ignore[attr-defined]
    link = http.portal.call(container.bootstrap_admin().execute, "boss@blakra.com", "Blakra")
    assert (
        http.post(f"/auth/invites/{link.token}", json={"password": "correct-horse-9"}, headers=CSRF).status_code == 200
    )

    unknown = http.post("/auth/login", json={"email": "nobody@blakra.com", "password": "whatever-123"}, headers=CSRF)
    wrong = http.post("/auth/login", json={"email": "boss@blakra.com", "password": "wrong-password"}, headers=CSRF)
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]
    for _ in range(2):
        http.post("/auth/login", json={"email": "boss@blakra.com", "password": "wrong-password"}, headers=CSRF)
    locked = http.post("/auth/login", json={"email": "boss@blakra.com", "password": "correct-horse-9"}, headers=CSRF)
    assert locked.status_code == 429 and int(locked.headers["retry-after"]) > 0

    reset = http.portal.call(container.bootstrap_admin().execute, "boss@blakra.com", "Blakra")  # forgot password
    assert http.get(f"/auth/invites/{link.token}").status_code == 404  # older link no longer works
    assert http.get(f"/auth/invites/{reset.token}").json()["passwordSet"] is True
