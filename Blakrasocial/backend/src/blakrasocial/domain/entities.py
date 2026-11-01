from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from blakrasocial.domain.enums import (
    ContentType,
    LinkedInVisibility,
    MediaKind,
    Platform,
    PublishState,
    TikTokVisibility,
)
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import AspectRatio, Caption, MediaUrl, PhoneNumber, PostId


@dataclass(frozen=True, slots=True)
class MediaAsset:
    """A file already stored at the provider, with metadata measured by the server."""

    url: MediaUrl
    kind: MediaKind
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None

    @property
    def aspect_ratio(self) -> AspectRatio | None:
        if self.width and self.height:
            return AspectRatio(self.width, self.height)
        return None

    @property
    def extension(self) -> str:
        path = self.url.value.split("?", 1)[0]
        return path.rsplit(".", 1)[-1].lower() if "." in path.rsplit("/", 1)[-1] else ""


# --- Per-platform options (typed, so each network gets only what it understands) ---


@dataclass(frozen=True, slots=True)
class PlatformOptions:
    """Marker base class for per-network options."""


@dataclass(frozen=True, slots=True)
class InstagramOptions(PlatformOptions):
    share_reels_to_feed: bool = True
    cover_image_url: str | None = None
    thumbnail_offset_ms: int | None = None
    collaborators: tuple[str, ...] = ()
    is_ai_generated: bool = False


@dataclass(frozen=True, slots=True)
class FacebookOptions(PlatformOptions):
    title: str | None = None
    thumbnail_url: str | None = None


@dataclass(frozen=True, slots=True)
class TikTokOptions(PlatformOptions):
    visibility: TikTokVisibility = TikTokVisibility.PUBLIC
    disable_comments: bool = False
    disable_duet: bool = False
    disable_stitch: bool = False
    is_ai_generated: bool = False
    is_branded_content: bool = False
    is_brand_organic: bool = False
    auto_add_music: bool = False
    title: str | None = None
    cover_index: int = 0
    thumbnail_offset_ms: int | None = None


@dataclass(frozen=True, slots=True)
class LinkedInOptions(PlatformOptions):
    visibility: LinkedInVisibility = LinkedInVisibility.PUBLIC
    document_title: str | None = None
    disable_share: bool = False


@dataclass(frozen=True, slots=True)
class WhatsAppOptions(PlatformOptions):
    recipients: tuple[PhoneNumber, ...] = ()


@dataclass(frozen=True, slots=True)
class PostTarget:
    platform: Platform
    content_type: ContentType
    options: PlatformOptions = field(default_factory=PlatformOptions)


@dataclass(frozen=True, slots=True)
class Post:
    """Aggregate root: one piece of content sent to one or more networks."""

    caption: Caption
    media: tuple[MediaAsset, ...]
    targets: tuple[PostTarget, ...]
    schedule_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.targets:
            raise InvalidValue("targets", "choose at least one network")
        platforms = [t.platform for t in self.targets]
        if len(platforms) != len(set(platforms)):
            raise InvalidValue("targets", "each network may appear only once per post")
        if self.schedule_at is not None and self.schedule_at.tzinfo is None:
            raise InvalidValue("scheduleAt", "must include a timezone")

    @property
    def is_scheduled(self) -> bool:
        return self.schedule_at is not None

    def targets_for(self, *platforms: Platform) -> tuple[PostTarget, ...]:
        return tuple(t for t in self.targets if t.platform in platforms)

    def without(self, *platforms: Platform) -> tuple[PostTarget, ...]:
        return tuple(t for t in self.targets if t.platform not in platforms)


@dataclass(frozen=True, slots=True)
class PlatformPublishResult:
    platform: Platform
    state: PublishState
    provider_post_id: str | None = None
    live_url: str | None = None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class PostStatus:
    id: PostId
    state: PublishState
    created_at: datetime | None
    schedule_at: datetime | None
    caption: str
    media_urls: tuple[str, ...]
    results: tuple[PlatformPublishResult, ...]


@dataclass(frozen=True, slots=True)
class ConnectedAccount:
    platform: Platform
    display_name: str
    username: str | None = None
    avatar_url: str | None = None
    profile_url: str | None = None
    account_type: str | None = None  # instagram: business|creator, linkedin: corporate|personal
    needs_reconnect: bool = False


@dataclass(frozen=True, slots=True)
class ConnectUrl:
    url: str
    expires_at: datetime | None


@dataclass(frozen=True, slots=True)
class MediaUploadTicket:
    upload_url: str
    access_url: str
    content_type: str
    expires_at: datetime | None


@dataclass(frozen=True, slots=True)
class OAuthCredential:
    """What a network gave us when the customer approved access. Tokens never leave the backend.

    `account_id` is the identity we publish as: Instagram user id, Facebook Page id, TikTok open_id,
    LinkedIn person URN or WhatsApp phone-number id. `extra` holds small network-specific facts.
    """

    platform: Platform
    account_id: str
    account: ConnectedAccount
    access_token: str = field(repr=False)
    refresh_token: str | None = field(default=None, repr=False)
    expires_at: datetime | None = None
    refresh_expires_at: datetime | None = None
    scopes: tuple[str, ...] = ()
    extra: dict[str, str] = field(default_factory=dict, hash=False, compare=False)
    needs_reconnect: bool = False

    def is_usable(self, now: datetime) -> bool:
        return not self.needs_reconnect and (self.expires_at is None or self.expires_at > now)
