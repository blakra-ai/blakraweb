"""TikTok: one video, or a photo post of 1-35 images (TikTok Content Posting API media rules)."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from types import MappingProxyType
from typing import ClassVar

from blakrasocial.domain.entities import MediaAsset, PostTarget, TikTokOptions
from blakrasocial.domain.enums import ContentType, MediaKind, Platform, TikTokVisibility
from blakrasocial.domain.validation.issue import IssueCode, ValidationIssue
from blakrasocial.domain.validation.rule import PlatformRule, ValidationContext
from blakrasocial.domain.validation.spec import GB, MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import VERTICAL_9_16, Caption

_CAPTION = 2200

_SPECS = MappingProxyType(
    {
        ContentType.VIDEO: ContentSpec(
            media=(
                MediaConstraints(
                    MediaKind.VIDEO,
                    frozenset({"mp4", "mov", "webm"}),
                    4 * GB,
                    (VERTICAL_9_16,),
                    3,
                    600,
                    min_width=360,
                    min_height=360,
                ),
            ),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
        ),
        ContentType.PHOTO: ContentSpec(
            media=(MediaConstraints(MediaKind.IMAGE, frozenset({"jpg", "jpeg", "webp"}), 20 * MB),),
            min_media=1,
            max_media=35,
            max_caption_length=_CAPTION,
        ),
    }
)


class TikTokRule(PlatformRule):
    platform: ClassVar[Platform] = Platform.TIKTOK

    def specs(self) -> Mapping[ContentType, ContentSpec]:
        return _SPECS

    def _extra_checks(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        options = target.options
        if not isinstance(options, TikTokOptions):
            return []
        issues: list[ValidationIssue] = []
        if options.visibility is None:
            issues.append(self._issue(IssueCode.PRIVACY_REQUIRED, "options.visibility", target))
        elif options.is_branded_content and options.visibility is TikTokVisibility.PRIVATE:
            issues.append(self._issue(IssueCode.BRANDED_CONTENT_PRIVATE, "options.visibility", target))
        if target.content_type is ContentType.PHOTO and not 0 <= options.cover_index < max(len(media), 1):
            issues.append(
                self._issue(
                    IssueCode.OPTION_INVALID,
                    "options.coverIndex",
                    target,
                    detail="Cover index must point to one of the uploaded photos.",
                )
            )
        return issues
