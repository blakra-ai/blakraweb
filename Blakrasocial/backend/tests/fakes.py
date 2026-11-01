"""In-memory test doubles for every port. Shared by unit and API tests."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from blakrasocial.application.dto import (
    DirectMessageResult,
    ListPostsQuery,
    MediaMetadata,
    Page,
    PublishEvent,
)
from blakrasocial.domain.entities import (
    ConnectedAccount,
    ConnectUrl,
    MediaUploadTicket,
    PlatformPublishResult,
    Post,
    PostStatus,
)
from blakrasocial.domain.enums import MediaKind, Platform, PublishState
from blakrasocial.domain.value_objects import IdempotencyKey, PhoneNumber, PostId, ProfileKey

NOW = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)


class FixedClock:
    def __init__(self, now: datetime = NOW) -> None:
        self.current = now

    def now(self) -> datetime:
        return self.current

    def advance(self, delta: timedelta) -> None:
        self.current += delta


@dataclass
class FakePublisher:
    accounts: list[ConnectedAccount] = field(default_factory=list)
    published: list[tuple[ProfileKey, Post, IdempotencyKey]] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)
    unlinked: list[Platform] = field(default_factory=list)
    fail_with: Exception | None = None

    async def create_profile(self, title: str) -> ProfileKey:
        return ProfileKey(f"pk_{title.lower().replace(' ', '_')}_123456")

    async def get_connect_url(self, profile: ProfileKey, redirect_url: str | None, origin: str | None) -> ConnectUrl:
        return ConnectUrl("https://link.example.com/session/abc", NOW + timedelta(minutes=5))

    async def get_connected_accounts(self, profile: ProfileKey) -> list[ConnectedAccount]:
        return list(self.accounts)

    async def unlink_account(self, profile: ProfileKey, platform: Platform) -> None:
        self.unlinked.append(platform)

    async def upload_media(self, profile: ProfileKey, file_name: str, content_type: str) -> MediaUploadTicket:
        return MediaUploadTicket(
            upload_url=f"https://upload.example.com/{file_name}?sig=1",
            access_url=f"https://media.example.com/{file_name}",
            content_type=content_type,
            expires_at=NOW + timedelta(hours=1),
        )

    async def publish(self, profile: ProfileKey, post: Post, idempotency_key: IdempotencyKey) -> PostStatus:
        if self.fail_with is not None:
            raise self.fail_with
        self.published.append((profile, post, idempotency_key))
        state = PublishState.SCHEDULED if post.is_scheduled else PublishState.PUBLISHED
        return PostStatus(
            id=PostId(f"post{len(self.published)}"),
            state=state,
            created_at=NOW,
            schedule_at=post.schedule_at,
            caption=post.caption.text,
            media_urls=tuple(m.url.value for m in post.media),
            results=tuple(
                PlatformPublishResult(t.platform, state, live_url=f"https://{t.platform.value}.example/p/1")
                for t in post.targets
            ),
        )

    async def delete_post(self, profile: ProfileKey, post_id: PostId) -> None:
        self.deleted.append(post_id.value)

    async def get_post_status(self, profile: ProfileKey, post_id: PostId) -> PostStatus:
        return PostStatus(post_id, PublishState.PUBLISHED, NOW, None, "hi", (), ())

    async def list_posts(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]:
        return Page(items=(await self.get_post_status(profile, PostId("post1")),), total=1)


@dataclass
class FakeMessenger:
    sent: list[tuple[str, str, Sequence[str]]] = field(default_factory=list)
    failing: set[str] = field(default_factory=set)

    async def send(
        self, profile: ProfileKey, recipient: PhoneNumber, text: str, media_urls: Sequence[str]
    ) -> DirectMessageResult:
        self.sent.append((recipient.digits, text, media_urls))
        if recipient.digits in self.failing:
            return DirectMessageResult(recipient.digits, False, error="outside 24h window")
        return DirectMessageResult(recipient.digits, True, message_id="wamid.1")


@dataclass
class FakeInspector:
    """Returns metadata registered per URL; defaults to a valid 9:16 30s MP4."""

    by_url: dict[str, MediaMetadata] = field(default_factory=dict)

    async def inspect(self, url: str, content_type_hint: str | None = None) -> MediaMetadata:
        return self.by_url.get(url, vertical_video())


def vertical_video(duration: float = 30.0, size: int = 20 * 1024 * 1024) -> MediaMetadata:
    return MediaMetadata(MediaKind.VIDEO, "video/mp4", size, 1080, 1920, duration)


def square_image(size: int = 1024 * 1024) -> MediaMetadata:
    return MediaMetadata(MediaKind.IMAGE, "image/jpeg", size, 1080, 1080)


@dataclass
class RecordingSink:
    events: list[PublishEvent] = field(default_factory=list)

    async def handle(self, event: PublishEvent) -> None:
        self.events.append(event)


def account(platform: Platform, account_type: str | None = None) -> ConnectedAccount:
    return ConnectedAccount(platform, f"Blakra {platform.value}", "blakra", account_type=account_type)
