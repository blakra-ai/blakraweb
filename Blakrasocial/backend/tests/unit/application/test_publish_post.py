from __future__ import annotations

import asyncio
from datetime import timedelta

import pytest

from blakrasocial.application.dto import MediaReference, PublishPostCommand
from blakrasocial.application.errors import (
    IdempotencyConflict,
    MediaRejected,
    ProviderUnavailable,
    RequestInProgress,
)
from blakrasocial.application.use_cases import PublishPost, SchedulePost
from blakrasocial.domain.entities import PostTarget, WhatsAppOptions
from blakrasocial.domain.enums import ContentType, Platform, PublishState
from blakrasocial.domain.errors import ValidationFailed
from blakrasocial.domain.validation import IssueCode
from blakrasocial.domain.value_objects import IdempotencyKey, PhoneNumber, ProfileKey
from tests.fakes import NOW, square_image

VIDEO_URL = "https://media.example.com/clip.mp4"
KEY = IdempotencyKey("key-0000-0001")


@pytest.fixture
def use_case(publisher, messenger, registry, inspector, signer, idempotency, clock) -> PublishPost:  # type: ignore[no-untyped-def]
    return PublishPost(publisher, messenger, registry, inspector, signer, idempotency, clock)


@pytest.fixture
def media(signer, profile) -> MediaReference:  # type: ignore[no-untyped-def]
    token = signer.sign(profile, VIDEO_URL, "video/mp4", NOW + timedelta(days=29))
    return MediaReference(VIDEO_URL, token)


def command(media: MediaReference, *targets: PostTarget, schedule_in: timedelta | None = None) -> PublishPostCommand:
    return PublishPostCommand(
        caption="New launch",
        media=(media,),
        targets=targets or (PostTarget(Platform.INSTAGRAM, ContentType.REEL),),
        schedule_at=NOW + schedule_in if schedule_in else None,
    )


async def test_publishes_valid_post_to_all_networks(use_case, media, profile, publisher) -> None:  # type: ignore[no-untyped-def]
    outcome = await use_case.execute(
        profile,
        command(
            media, PostTarget(Platform.INSTAGRAM, ContentType.REEL), PostTarget(Platform.TIKTOK, ContentType.VIDEO)
        ),
        KEY,
    )
    assert outcome.status.state is PublishState.PUBLISHED
    assert [r.platform for r in outcome.status.results] == [Platform.INSTAGRAM, Platform.TIKTOK]
    [(_, post, key)] = publisher.published
    assert post.media[0].width == 1080  # measured by the inspector, not the client
    assert key.value.startswith("pub:")  # scoped per profile before reaching the provider


async def test_invalid_post_never_reaches_provider(use_case, media, profile, publisher, inspector) -> None:  # type: ignore[no-untyped-def]
    from blakrasocial.application.dto import MediaMetadata
    from blakrasocial.domain.enums import MediaKind

    inspector.by_url[VIDEO_URL] = MediaMetadata(MediaKind.VIDEO, "video/mp4", 1000, 1920, 1080, 30)
    with pytest.raises(ValidationFailed) as exc:
        await use_case.execute(profile, command(media), KEY)
    assert {i.code for i in exc.value.issues} == {IssueCode.ASPECT_RATIO}
    assert publisher.published == []


async def test_same_key_and_body_replays_without_publishing_twice(use_case, media, profile, publisher) -> None:  # type: ignore[no-untyped-def]
    first = await use_case.execute(profile, command(media), KEY)
    second = await use_case.execute(profile, command(media), KEY)
    assert len(publisher.published) == 1
    assert second.replayed and second.status.id == first.status.id


async def test_same_key_different_body_conflicts(use_case, media, profile) -> None:  # type: ignore[no-untyped-def]
    await use_case.execute(profile, command(media), KEY)
    with pytest.raises(IdempotencyConflict):
        await use_case.execute(profile, command(media, PostTarget(Platform.TIKTOK, ContentType.VIDEO)), KEY)


async def test_keys_are_isolated_per_profile(use_case, media, profile, publisher, signer) -> None:  # type: ignore[no-untyped-def]
    await use_case.execute(profile, command(media), KEY)
    other = ProfileKey("pk_other_customer")
    other_media = MediaReference(VIDEO_URL, signer.sign(other, VIDEO_URL, "video/mp4", NOW + timedelta(days=1)))
    await use_case.execute(other, command(other_media), KEY)
    assert len(publisher.published) == 2


async def test_concurrent_duplicate_is_rejected_while_in_progress(use_case, media, profile, publisher) -> None:  # type: ignore[no-untyped-def]
    gate = asyncio.Event()
    original = publisher.publish

    async def slow_publish(*args):  # type: ignore[no-untyped-def]
        await gate.wait()
        return await original(*args)

    publisher.publish = slow_publish
    first = asyncio.create_task(use_case.execute(profile, command(media), KEY))
    await asyncio.sleep(0)
    with pytest.raises(RequestInProgress):
        await use_case.execute(profile, command(media), KEY)
    gate.set()
    await first


async def test_provider_failure_releases_key_for_retry(use_case, media, profile, publisher) -> None:  # type: ignore[no-untyped-def]
    publisher.fail_with = ProviderUnavailable("down")
    with pytest.raises(ProviderUnavailable):
        await use_case.execute(profile, command(media), KEY)
    publisher.fail_with = None
    outcome = await use_case.execute(profile, command(media), KEY)
    assert not outcome.replayed


async def test_forged_or_foreign_media_token_is_rejected(use_case, media, profile, signer) -> None:  # type: ignore[no-untyped-def]
    forged = MediaReference("https://evil.example.com/x.mp4", media.token)
    with pytest.raises(MediaRejected):
        await use_case.execute(profile, command(forged), KEY)
    foreign = ProfileKey("pk_someone_else")
    with pytest.raises(MediaRejected):
        await use_case.execute(foreign, command(media), IdempotencyKey("key-0000-0002"))


async def test_schedule_must_be_in_future(use_case, media, profile) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(ValidationFailed) as exc:
        await use_case.execute(profile, command(media, schedule_in=timedelta(minutes=1)), KEY)
    assert exc.value.issues[0].code is IssueCode.SCHEDULE_IN_PAST


async def test_schedule_post_requires_date_and_returns_scheduled(use_case, media, profile) -> None:  # type: ignore[no-untyped-def]
    schedule = SchedulePost(use_case)
    with pytest.raises(ValidationFailed):
        await schedule.execute(profile, command(media), KEY)
    outcome = await schedule.execute(profile, command(media, schedule_in=timedelta(days=2)), KEY)
    assert outcome.status.state is PublishState.SCHEDULED


async def test_whatsapp_goes_to_messenger_and_partial_failures_are_reported(  # type: ignore[no-untyped-def]
    use_case, profile, publisher, messenger, inspector, signer
) -> None:
    url = "https://media.example.com/photo.jpg"
    inspector.by_url[url] = square_image()
    ref = MediaReference(url, signer.sign(profile, url, "image/jpeg", NOW + timedelta(days=1)))
    recipients = (PhoneNumber.parse("14155551234"), PhoneNumber.parse("989121234567"))
    messenger.failing.add("989121234567")
    cmd = PublishPostCommand(
        caption="Hi",
        media=(ref,),
        targets=(
            PostTarget(Platform.FACEBOOK, ContentType.POST),
            PostTarget(Platform.WHATSAPP, ContentType.MESSAGE, WhatsAppOptions(recipients)),
        ),
    )
    outcome = await use_case.execute(profile, cmd, KEY)
    [(_, post, _)] = publisher.published
    assert [t.platform for t in post.targets] == [Platform.FACEBOOK]
    assert len(messenger.sent) == 2
    whatsapp = next(r for r in outcome.status.results if r.platform is Platform.WHATSAPP)
    assert whatsapp.state is PublishState.PUBLISHED and "1/2 not delivered" in (whatsapp.error or "")
