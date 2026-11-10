"""Plain data crossing the application boundary. No framework types here."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from blakrasocial.domain.entities import MediaUploadTicket, PostStatus, PostTarget
from blakrasocial.domain.enums import MediaKind, Platform
from blakrasocial.domain.validation import ValidationIssue
from blakrasocial.domain.value_objects import ProfileKey


@dataclass(frozen=True, slots=True)
class CallerIdentity:
    subject: str
    profile_key: ProfileKey | None
    scopes: frozenset[str] = frozenset()


@dataclass(frozen=True, slots=True)
class CreateProfileCommand:
    title: str


@dataclass(frozen=True, slots=True)
class ConnectAccountCommand:
    platform: Platform | None = None
    redirect_url: str | None = None
    origin: str | None = None


@dataclass(frozen=True, slots=True)
class UploadMediaCommand:
    file_name: str
    content_type: str
    size_bytes: int


@dataclass(frozen=True, slots=True)
class SignedUploadTicket:
    """What the client gets: where to PUT the file, and a token proving we issued it."""

    ticket: MediaUploadTicket
    media_token: str
    media_expires_at: datetime


@dataclass(frozen=True, slots=True)
class MediaReference:
    url: str
    token: str


@dataclass(frozen=True, slots=True)
class MediaMetadata:
    """Facts measured on the server by `MediaInspector`; the client's numbers are never trusted."""

    kind: MediaKind
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    duration_seconds: float | None = None


@dataclass(frozen=True, slots=True)
class PublishPostCommand:
    caption: str
    media: tuple[MediaReference, ...]
    targets: tuple[PostTarget, ...]
    schedule_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class PublishOutcome:
    status: PostStatus
    warnings: tuple[ValidationIssue, ...] = ()
    replayed: bool = False


@dataclass(frozen=True, slots=True)
class ListPostsQuery:
    limit: int = 25
    platform: Platform | None = None
    last_days: int = 30


@dataclass(frozen=True, slots=True)
class Page[T]:
    items: tuple[T, ...]
    total: int | None = None


@dataclass(frozen=True, slots=True)
class DirectMessageResult:
    recipient: str
    succeeded: bool
    message_id: str | None = None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class PublishEvent:
    """Provider-neutral publish result delivered by a webhook."""

    post_id: str
    succeeded: bool
    results: tuple[dict[str, str | None], ...] = field(default_factory=tuple)
    raw_action: str = ""
