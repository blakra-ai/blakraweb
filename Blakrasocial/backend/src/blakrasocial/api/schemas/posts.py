from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, Field

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.api.schemas.problem import ProblemIssue
from blakrasocial.application.dto import MediaReference, PublishOutcome, PublishPostCommand
from blakrasocial.domain.entities import (
    FacebookOptions,
    InstagramOptions,
    LinkedInOptions,
    PlatformOptions,
    PostStatus,
    PostTarget,
    TikTokOptions,
    WhatsAppOptions,
)
from blakrasocial.domain.enums import (
    ContentType,
    LinkedInVisibility,
    Platform,
    PublishState,
    TikTokVisibility,
)
from blakrasocial.domain.validation import ValidationIssue
from blakrasocial.domain.value_objects import PhoneNumber

# ------------------------------------------------------------ per-platform options


class InstagramOptionsIn(CamelModel):
    share_reels_to_feed: bool = True
    cover_image_url: Annotated[str, Field(pattern=r"^https://", max_length=2048)] | None = None
    thumbnail_offset_ms: Annotated[int, Field(ge=0)] | None = None
    collaborators: list[Annotated[str, Field(max_length=30)]] = Field(default_factory=list, max_length=3)
    is_ai_generated: bool = False

    def to_domain(self) -> InstagramOptions:
        return InstagramOptions(
            self.share_reels_to_feed,
            self.cover_image_url,
            self.thumbnail_offset_ms,
            tuple(self.collaborators),
            self.is_ai_generated,
        )


class FacebookOptionsIn(CamelModel):
    title: Annotated[str, Field(max_length=255)] | None = None
    thumbnail_url: Annotated[str, Field(pattern=r"^https://", max_length=2048)] | None = None

    def to_domain(self) -> FacebookOptions:
        return FacebookOptions(self.title, self.thumbnail_url)


class TikTokOptionsIn(CamelModel):
    visibility: TikTokVisibility = TikTokVisibility.PUBLIC
    disable_comments: bool = False
    disable_duet: bool = False
    disable_stitch: bool = False
    is_ai_generated: bool = False
    is_branded_content: bool = False
    is_brand_organic: bool = False
    auto_add_music: bool = False
    title: Annotated[str, Field(max_length=90)] | None = None
    cover_index: Annotated[int, Field(ge=0)] = 0
    thumbnail_offset_ms: Annotated[int, Field(ge=0)] | None = None

    def to_domain(self) -> TikTokOptions:
        return TikTokOptions(**self.model_dump())


class LinkedInOptionsIn(CamelModel):
    visibility: LinkedInVisibility = LinkedInVisibility.PUBLIC
    document_title: Annotated[str, Field(max_length=400)] | None = None
    disable_share: bool = False

    def to_domain(self) -> LinkedInOptions:
        return LinkedInOptions(self.visibility, self.document_title, self.disable_share)


class WhatsAppOptionsIn(CamelModel):
    recipients: list[Annotated[str, Field(max_length=32)]] = Field(default_factory=list, max_length=200)

    def to_domain(self) -> WhatsAppOptions:
        return WhatsAppOptions(tuple(PhoneNumber.parse(r) for r in self.recipients))


# ------------------------------------------------------------ targets (discriminated by platform)


class _TargetBase(CamelModel):
    content_type: ContentType


class InstagramTarget(_TargetBase):
    platform: Literal[Platform.INSTAGRAM]
    options: InstagramOptionsIn = Field(default_factory=InstagramOptionsIn)


class FacebookTarget(_TargetBase):
    platform: Literal[Platform.FACEBOOK]
    options: FacebookOptionsIn = Field(default_factory=FacebookOptionsIn)


class TikTokTarget(_TargetBase):
    platform: Literal[Platform.TIKTOK]
    options: TikTokOptionsIn = Field(default_factory=TikTokOptionsIn)


class LinkedInTarget(_TargetBase):
    platform: Literal[Platform.LINKEDIN]
    options: LinkedInOptionsIn = Field(default_factory=LinkedInOptionsIn)


class WhatsAppTarget(_TargetBase):
    platform: Literal[Platform.WHATSAPP]
    options: WhatsAppOptionsIn = Field(default_factory=WhatsAppOptionsIn)


TargetIn = Annotated[
    InstagramTarget | FacebookTarget | TikTokTarget | LinkedInTarget | WhatsAppTarget,
    Field(discriminator="platform"),
]


class MediaRefIn(CamelModel):
    url: Annotated[str, Field(pattern=r"^https://", max_length=2048)]
    token: Annotated[str, Field(min_length=10, max_length=512)]


class PublishPostRequest(CamelModel):
    caption: Annotated[str, Field(max_length=63_206)] = ""
    media: list[MediaRefIn] = Field(default_factory=list, max_length=35)
    targets: list[TargetIn] = Field(min_length=1, max_length=len(Platform))
    schedule_at: AwareDatetime | None = None

    def to_command(self) -> PublishPostCommand:
        targets: list[PostTarget] = []
        for target in self.targets:
            options: PlatformOptions = target.options.to_domain()
            targets.append(PostTarget(target.platform, target.content_type, options))
        return PublishPostCommand(
            caption=self.caption,
            media=tuple(MediaReference(m.url, m.token) for m in self.media),
            targets=tuple(targets),
            schedule_at=self.schedule_at,
        )


# ------------------------------------------------------------ responses


class PlatformResultOut(CamelModel):
    platform: Platform
    state: PublishState
    provider_post_id: str | None
    live_url: str | None
    error: str | None


class PostStatusOut(CamelModel):
    id: str
    state: PublishState
    created_at: datetime | None
    schedule_at: datetime | None
    caption: str
    media_urls: list[str]
    results: list[PlatformResultOut]

    @classmethod
    def from_domain(cls, status: PostStatus) -> PostStatusOut:
        return cls(
            id=status.id.value,
            state=status.state,
            created_at=status.created_at,
            schedule_at=status.schedule_at,
            caption=status.caption,
            media_urls=list(status.media_urls),
            results=[
                PlatformResultOut(
                    platform=r.platform,
                    state=r.state,
                    provider_post_id=r.provider_post_id,
                    live_url=r.live_url,
                    error=r.error,
                )
                for r in status.results
            ],
        )


class PublishPostResponse(PostStatusOut):
    warnings: list[ProblemIssue]
    replayed: bool

    @classmethod
    def from_outcome(cls, outcome: PublishOutcome) -> PublishPostResponse:
        base = PostStatusOut.from_domain(outcome.status)
        return cls(
            **base.model_dump(),
            warnings=[issue_out(w) for w in outcome.warnings],
            replayed=outcome.replayed,
        )


class PostListResponse(CamelModel):
    items: list[PostStatusOut]
    total: int | None


def issue_out(issue: ValidationIssue) -> ProblemIssue:
    return ProblemIssue(
        code=issue.code.value,
        platform=issue.platform.value if issue.platform else None,
        field=issue.field,
        severity=issue.severity.value,
        message=issue.message,
        params=issue.params,
    )
