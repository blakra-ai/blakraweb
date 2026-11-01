"""Direct mode against a real PostgreSQL (set TEST_DATABASE_URL; skipped when it's unreachable)."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import text

from blakrasocial.application.direct import (
    AccountLinker,
    DirectSocialPublisher,
    Network,
    NetworkRegistry,
    PostQueue,
    PublishWorker,
    TokenRefresher,
)
from blakrasocial.application.dto import ListPostsQuery
from blakrasocial.application.errors import (
    NotConfigured,
    NotFound,
    ProviderAuthError,
    ProviderRejected,
    ProviderUnavailable,
    Unauthorized,
)
from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.application.ports.repositories import profile_id_of
from blakrasocial.domain.entities import MediaAsset, Post, PostTarget
from blakrasocial.domain.enums import ContentType, MediaKind, Platform, PublishState
from blakrasocial.domain.value_objects import Caption, IdempotencyKey, MediaUrl
from blakrasocial.infrastructure.persistence import (
    SqlAuthorizationStateRepository,
    SqlCredentialRepository,
    SqlPostRepository,
    SqlProfileRepository,
    create_engine,
    session_factory,
)
from blakrasocial.infrastructure.persistence.models import Base
from blakrasocial.infrastructure.security.aes_cipher import AesGcmCipher
from tests.direct_fakes import TEST_KEY, CountingSignal, FakeConnector, FakeProvider, FakeStorage, credential
from tests.fakes import FixedClock

DB_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://postgres@localhost:5433/blakrasocial_test")


class World:
    def __init__(self, sessions, clock: FixedClock) -> None:  # type: ignore[no-untyped-def]
        self.clock = clock
        self.cipher = AesGcmCipher([TEST_KEY])
        self.profiles = SqlProfileRepository(sessions, clock)
        self.credentials = SqlCredentialRepository(sessions, self.cipher, clock)
        self.states = SqlAuthorizationStateRepository(sessions, self.cipher)
        self.posts = SqlPostRepository(sessions)
        self.providers = {p: FakeProvider(p) for p in (Platform.LINKEDIN, Platform.FACEBOOK)}
        self.connectors = {p: FakeConnector() for p in self.providers}
        self.registry = NetworkRegistry({p: Network(self.providers[p], self.connectors[p]) for p in self.providers})
        self.signal = CountingSignal()
        self.linker = AccountLinker(
            self.registry, self.profiles, self.credentials, self.states, clock, "https://api.blakra.test"
        )
        self.queue = PostQueue(self.posts, self.credentials, self.registry, clock, self.signal)
        self.publisher = DirectSocialPublisher(self.profiles, self.linker, self.queue, FakeStorage())
        self.worker = PublishWorker(self.posts, self.credentials, self.registry, clock)
        self.refresher = TokenRefresher(self.credentials, self.registry, clock)
        self.sessions = sessions


@pytest.fixture
async def world() -> AsyncIterator[World]:
    engine = create_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    except OSError:
        await engine.dispose()
        pytest.skip("PostgreSQL not reachable (set TEST_DATABASE_URL)")
    yield World(session_factory(engine), FixedClock())
    await engine.dispose()


async def connect(world: World, platform: Platform = Platform.LINKEDIN):  # type: ignore[no-untyped-def]
    profile = await world.publisher.create_profile("Customer")
    url = await world.publisher.get_connect_url(profile, platform, "https://app.blakra.test/done", None)
    state = parse_qs(urlparse(url.url).query)["state"][0]
    outcome = await world.linker.complete(platform, "code-123", state)
    return profile, state, outcome


def video_post(*platforms: Platform, schedule_in: timedelta | None = None, now=None):  # type: ignore[no-untyped-def]
    return Post(
        caption=Caption("Hello"),
        media=(MediaAsset(MediaUrl("https://cdn.test/u/a.mp4"), MediaKind.VIDEO, "video/mp4", 1000, 1080, 1920, 10.0),),
        targets=tuple(PostTarget(p, ContentType.VIDEO) for p in platforms),
        schedule_at=(now + schedule_in) if schedule_in else None,
    )


# ---------------------------------------------------------------- linking


async def test_oauth_flow_stores_encrypted_credential_and_state_is_single_use(world: World) -> None:
    profile, state, outcome = await connect(world)
    assert outcome.connected is not None and outcome.redirect_url == "https://app.blakra.test/done"
    _code, redirect_uri, verifier = world.providers[Platform.LINKEDIN].exchanged[0]
    assert redirect_uri == "https://api.blakra.test/oauth/linkedin/callback" and verifier

    accounts = await world.publisher.get_connected_accounts(profile)
    assert [a.platform for a in accounts] == [Platform.LINKEDIN]

    async with world.sessions() as s:
        raw = (await s.execute(text("select secret from credentials"))).scalar_one()
    assert "token-linkedin" not in raw and raw.startswith("v1.k1.")

    with pytest.raises(Unauthorized):
        await world.linker.complete(Platform.LINKEDIN, "code-123", state)  # replay


async def test_state_is_bound_to_platform_and_expires(world: World) -> None:
    profile = await world.publisher.create_profile("C")
    url = await world.publisher.get_connect_url(profile, Platform.LINKEDIN, None, None)
    state = parse_qs(urlparse(url.url).query)["state"][0]
    with pytest.raises(Unauthorized):
        await world.linker.complete(Platform.FACEBOOK, "c", state)

    url = await world.publisher.get_connect_url(profile, Platform.LINKEDIN, None, None)
    state = parse_qs(urlparse(url.url).query)["state"][0]
    world.clock.advance(timedelta(minutes=11))
    with pytest.raises(Unauthorized):
        await world.linker.complete(Platform.LINKEDIN, "c", state)


async def test_connect_requires_known_profile_and_configured_network(world: World) -> None:
    from blakrasocial.domain.value_objects import ProfileKey

    with pytest.raises(NotFound):
        await world.publisher.get_connect_url(ProfileKey("pk_unknown_000000"), Platform.LINKEDIN, None, None)
    profile = await world.publisher.create_profile("C")
    with pytest.raises(NotConfigured):
        await world.publisher.get_connect_url(profile, Platform.TIKTOK, None, None)


async def test_facebook_with_several_pages_asks_which_one(world: World) -> None:
    world.providers[Platform.FACEBOOK].results = [
        credential(Platform.FACEBOOK, "page-1"),
        credential(Platform.FACEBOOK, "page-2"),
    ]
    profile, _, outcome = await connect(world, Platform.FACEBOOK)
    assert [c[0] for c in outcome.choices] == ["page-1", "page-2"] and outcome.selection_token
    done = await world.linker.choose(Platform.FACEBOOK, outcome.selection_token, "page-2")
    assert done.connected is not None
    saved = await world.credentials.get(profile_id_of(profile), Platform.FACEBOOK)
    assert saved is not None and saved.account_id == "page-2"


async def test_unlink_removes_credential(world: World) -> None:
    profile, _, _ = await connect(world)
    await world.publisher.unlink_account(profile, Platform.LINKEDIN)
    assert await world.publisher.get_connected_accounts(profile) == []
    with pytest.raises(NotFound):
        await world.publisher.unlink_account(profile, Platform.LINKEDIN)


# ---------------------------------------------------------------- queue + worker


async def test_publish_now_runs_through_worker(world: World) -> None:
    profile, _, _ = await connect(world)
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000001"))
    assert status.state is PublishState.PENDING and world.signal.count == 1

    assert await world.worker.run_once() == 1
    done = await world.publisher.get_post_status(profile, status.id)
    assert done.state is PublishState.PUBLISHED
    assert done.results[0].live_url == "https://network.test/p/remote-1"
    assert await world.worker.run_once() == 0  # nothing left


async def test_same_idempotency_key_returns_same_post(world: World) -> None:
    profile, _, _ = await connect(world)
    first = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000001"))
    again = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000001"))
    assert first.id == again.id
    page = await world.publisher.list_posts(profile, ListPostsQuery())
    assert page.total == 1


async def test_processing_is_polled_until_published(world: World) -> None:
    profile, _, _ = await connect(world)
    connector = world.connectors[Platform.LINKEDIN]
    connector.script = [ConnectorResult.processing("handle-9", timedelta(seconds=30))]
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000002"))
    await world.worker.run_once()
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.PENDING
    assert await world.worker.run_once() == 0  # not due yet
    world.clock.advance(timedelta(seconds=31))
    await world.worker.run_once()
    assert connector.calls[-1] == ("poll", "handle-9")
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.PUBLISHED


async def test_transient_failure_is_retried_with_backoff(world: World) -> None:
    profile, _, _ = await connect(world)
    world.connectors[Platform.LINKEDIN].script = [ProviderUnavailable("down")]
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000003"))
    await world.worker.run_once()
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.PENDING
    assert await world.worker.run_once() == 0
    world.clock.advance(timedelta(seconds=31))
    await world.worker.run_once()
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.PUBLISHED


async def test_auth_error_fails_target_and_flags_reconnect(world: World) -> None:
    profile, _, _ = await connect(world)
    world.connectors[Platform.LINKEDIN].script = [ProviderAuthError("revoked")]
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000004"))
    await world.worker.run_once()
    result = await world.publisher.get_post_status(profile, status.id)
    assert result.state is PublishState.FAILED and "reconnected" in (result.results[0].error or "")
    accounts = await world.publisher.get_connected_accounts(profile)
    assert accounts[0].needs_reconnect


async def test_rejection_fails_with_network_message(world: World) -> None:
    profile, _, _ = await connect(world)
    world.connectors[Platform.LINKEDIN].script = [ProviderRejected("Video too long")]
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000005"))
    await world.worker.run_once()
    result = await world.publisher.get_post_status(profile, status.id)
    assert result.state is PublishState.FAILED and result.results[0].error == "Video too long"


async def test_partial_when_one_network_fails(world: World) -> None:
    profile, _, _ = await connect(world)
    world.providers[Platform.FACEBOOK].results = [credential(Platform.FACEBOOK, "page-1")]
    url = await world.publisher.get_connect_url(profile, Platform.FACEBOOK, None, None)
    await world.linker.complete(Platform.FACEBOOK, "c", parse_qs(urlparse(url.url).query)["state"][0])
    world.connectors[Platform.FACEBOOK].script = [ProviderRejected("nope")]
    status = await world.publisher.publish(
        profile, video_post(Platform.LINKEDIN, Platform.FACEBOOK), IdempotencyKey("key-00000006")
    )
    await world.worker.run_once()
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.PARTIAL


async def test_scheduled_post_waits_and_can_be_cancelled(world: World) -> None:
    profile, _, _ = await connect(world)
    post = video_post(Platform.LINKEDIN, schedule_in=timedelta(hours=1), now=world.clock.now())
    status = await world.publisher.publish(profile, post, IdempotencyKey("key-00000007"))
    assert status.state is PublishState.SCHEDULED and world.signal.count == 0
    assert await world.worker.run_once() == 0
    await world.publisher.delete_post(profile, status.id)
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.DELETED
    world.clock.advance(timedelta(hours=2))
    assert await world.worker.run_once() == 0


async def test_delete_published_post_uses_connector_or_refuses(world: World) -> None:
    profile, _, _ = await connect(world)
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000008"))
    await world.worker.run_once()
    world.connectors[Platform.LINKEDIN].can_delete = False
    with pytest.raises(ProviderRejected):
        await world.publisher.delete_post(profile, status.id)
    world.connectors[Platform.LINKEDIN].can_delete = True
    await world.publisher.delete_post(profile, status.id)
    assert world.connectors[Platform.LINKEDIN].deleted == ["remote-1"]


async def test_posts_are_isolated_per_profile(world: World) -> None:
    profile, _, _ = await connect(world)
    other = await world.publisher.create_profile("Other")
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000009"))
    with pytest.raises(NotFound):
        await world.publisher.get_post_status(other, status.id)
    assert (await world.publisher.list_posts(other, ListPostsQuery())).items == ()


async def test_missing_credential_fails_target(world: World) -> None:
    profile, _, _ = await connect(world)
    status = await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey("key-00000010"))
    await world.publisher.unlink_account(profile, Platform.LINKEDIN)
    await world.worker.run_once()
    assert (await world.publisher.get_post_status(profile, status.id)).state is PublishState.FAILED


# ---------------------------------------------------------------- token refresh


async def test_refresher_renews_soon_expiring_tokens_and_flags_revoked(world: World) -> None:
    profile = await world.publisher.create_profile("C")
    pid = profile_id_of(profile)
    soon = world.clock.now() + timedelta(days=2)
    await world.credentials.save(pid, credential(Platform.LINKEDIN, expires_at=soon))
    await world.credentials.save(pid, credential(Platform.FACEBOOK, expires_at=soon))
    world.providers[Platform.FACEBOOK].refresh_error = ProviderAuthError("revoked")

    assert await world.refresher.run_once() == 1
    linkedin = await world.credentials.get(pid, Platform.LINKEDIN)
    facebook = await world.credentials.get(pid, Platform.FACEBOOK)
    assert linkedin is not None and linkedin.access_token.endswith("-refreshed")
    assert facebook is not None and facebook.needs_reconnect


async def test_concurrent_workers_never_claim_the_same_target(world: World) -> None:
    import asyncio

    profile, _, _ = await connect(world)
    for i in range(6):
        await world.publisher.publish(profile, video_post(Platform.LINKEDIN), IdempotencyKey(f"key-0000010{i}"))
    claims = await asyncio.gather(
        *(world.posts.claim_due(world.clock.now(), 4, timedelta(minutes=5)) for _ in range(3))
    )
    ids = [c.target.id for batch in claims for c in batch]
    assert len(ids) == 6 and len(set(ids)) == 6
