"""Instagram (Business/Creator account linked to a Facebook Page).

Limits: Ayrshare Instagram media guidelines + Instagram Graph API publishing docs.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from types import MappingProxyType
from typing import ClassVar

from blakrasocial.domain.entities import MediaAsset, PostTarget
from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.domain.validation.issue import IssueCode, ValidationIssue
from blakrasocial.domain.validation.rule import PlatformRule, ValidationContext
from blakrasocial.domain.validation.spec import GB, MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import VERTICAL_9_16, AspectRatioRange, Caption

_IMAGE_EXT = frozenset({"jpg", "jpeg", "png"})
_VIDEO_EXT = frozenset({"mp4", "mov"})
_FEED_RATIOS = (AspectRatioRange(0.8, 1.91, "4:5 to 1.91:1"), VERTICAL_9_16)
_CAPTION = 2200

_FEED_IMAGE = MediaConstraints(MediaKind.IMAGE, _IMAGE_EXT, 8 * MB, _FEED_RATIOS, min_width=320, min_height=320)
_FEED_VIDEO = MediaConstraints(MediaKind.VIDEO, _VIDEO_EXT, 1 * GB, (), 3, 900)

_SPECS = MappingProxyType(
    {
        ContentType.POST: ContentSpec(
            media=(_FEED_IMAGE, _FEED_VIDEO),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
            max_hashtags=5,
            max_mentions=3,
        ),
        ContentType.CAROUSEL: ContentSpec(
            media=(_FEED_IMAGE, _FEED_VIDEO),
            min_media=2,
            max_media=10,
            allow_mixed_kinds=True,
            max_caption_length=_CAPTION,
            max_hashtags=5,
            max_mentions=3,
        ),
        ContentType.REEL: ContentSpec(
            media=(MediaConstraints(MediaKind.VIDEO, _VIDEO_EXT, 1 * GB, (VERTICAL_9_16,), 3, 900),),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
            max_hashtags=5,
            max_mentions=3,
        ),
        ContentType.STORY: ContentSpec(
            media=(
                MediaConstraints(MediaKind.IMAGE, frozenset({"jpg", "jpeg"}), 8 * MB, (VERTICAL_9_16,)),
                MediaConstraints(MediaKind.VIDEO, _VIDEO_EXT, 100 * MB, (VERTICAL_9_16,), 3, 60),
            ),
            min_media=1,
            max_media=1,
            caption_ignored=True,
        ),
    }
)

_PROFESSIONAL_TYPES = frozenset({"business", "creator"})


class InstagramRule(PlatformRule):
    platform: ClassVar[Platform] = Platform.INSTAGRAM

    def specs(self) -> Mapping[ContentType, ContentSpec]:
        return _SPECS

    def _extra_checks(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        account = context.accounts.get(self.platform)
        if account is None or account.account_type is None:
            return []
        account_type = account.account_type.lower()
        if account_type not in _PROFESSIONAL_TYPES:
            return [
                self._issue(
                    IssueCode.ACCOUNT_TYPE_UNSUPPORTED,
                    "platform",
                    target,
                    expected="Business or Creator",
                    actual=account_type,
                )
            ]
        if target.content_type is ContentType.STORY and account_type != "business":
            return [
                self._issue(
                    IssueCode.ACCOUNT_TYPE_UNSUPPORTED,
                    "contentType",
                    target,
                    expected="Business (Stories)",
                    actual=account_type,
                )
            ]
        return []
