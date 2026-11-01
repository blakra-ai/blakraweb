"""LinkedIn personal profile or company page. Limits: Ayrshare LinkedIn docs."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from types import MappingProxyType
from typing import ClassVar

from blakrasocial.domain.entities import LinkedInOptions, MediaAsset, PostTarget
from blakrasocial.domain.enums import ContentType, LinkedInVisibility, MediaKind, Platform
from blakrasocial.domain.validation.issue import IssueCode, ValidationIssue
from blakrasocial.domain.validation.rule import PlatformRule, ValidationContext
from blakrasocial.domain.validation.spec import GB, MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import Caption

_CAPTION = 3000

_SPECS = MappingProxyType(
    {
        ContentType.POST: ContentSpec(
            media=(MediaConstraints(MediaKind.IMAGE, frozenset({"jpg", "jpeg", "png", "gif"}), 8 * MB),),
            min_media=0,
            max_media=9,
            max_caption_length=_CAPTION,
        ),
        ContentType.VIDEO: ContentSpec(
            media=(MediaConstraints(MediaKind.VIDEO, frozenset({"mp4", "mov"}), 5 * GB, (), 3, 15 * 60),),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
        ),
        ContentType.DOCUMENT: ContentSpec(
            media=(MediaConstraints(MediaKind.DOCUMENT, frozenset({"pdf", "ppt", "pptx", "doc", "docx"}), 100 * MB),),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
        ),
    }
)


class LinkedInRule(PlatformRule):
    platform: ClassVar[Platform] = Platform.LINKEDIN

    def specs(self) -> Mapping[ContentType, ContentSpec]:
        return _SPECS

    def _extra_checks(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if target.content_type is ContentType.POST and caption.is_empty and not media:
            issues.append(self._issue(IssueCode.CAPTION_REQUIRED, "caption", target))

        options = target.options
        account = context.accounts.get(self.platform)
        if (
            isinstance(options, LinkedInOptions)
            and options.visibility is LinkedInVisibility.CONNECTIONS
            and account is not None
            and (account.account_type or "").lower() == "corporate"
        ):
            issues.append(
                self._issue(
                    IssueCode.OPTION_INVALID,
                    "options.visibility",
                    target,
                    detail="'Connections only' is available for personal LinkedIn profiles, not company pages.",
                )
            )
        if (
            isinstance(options, LinkedInOptions)
            and options.document_title is not None
            and len(options.document_title) > 400
        ):
            issues.append(
                self._issue(
                    IssueCode.OPTION_INVALID,
                    "options.documentTitle",
                    target,
                    detail="Document title can be at most 400 characters.",
                )
            )
        return issues
