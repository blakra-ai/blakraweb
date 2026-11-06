"""WhatsApp: direct messages to contacts only.

WhatsApp Status has no publishing API, so `story` is rejected with its own explicit code.
Free-form messages only reach contacts who wrote to the business in the last 24 hours.
Limits: WhatsApp Cloud API media limits (as documented by Ayrshare Messages API).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from types import MappingProxyType
from typing import ClassVar

from blakrasocial.domain.entities import MediaAsset, PostTarget, WhatsAppOptions
from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.domain.validation.issue import IssueCode, ValidationIssue
from blakrasocial.domain.validation.rule import PlatformRule, ValidationContext
from blakrasocial.domain.validation.spec import MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import Caption

MAX_RECIPIENTS = 50

_SPECS = MappingProxyType(
    {
        ContentType.MESSAGE: ContentSpec(
            media=(
                MediaConstraints(MediaKind.IMAGE, frozenset({"jpg", "jpeg", "png"}), 5 * MB),
                MediaConstraints(MediaKind.VIDEO, frozenset({"mp4", "3gp"}), 16 * MB),
                MediaConstraints(
                    MediaKind.DOCUMENT,
                    frozenset({"pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"}),
                    100 * MB,
                ),
            ),
            min_media=0,
            max_media=10,
            allow_mixed_kinds=True,
            max_caption_length=4096,
            schedulable=False,
        ),
    }
)


class WhatsAppRule(PlatformRule):
    platform: ClassVar[Platform] = Platform.WHATSAPP

    def specs(self) -> Mapping[ContentType, ContentSpec]:
        return _SPECS

    def validate(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        if target.content_type is ContentType.STORY:
            return [self._issue(IssueCode.WHATSAPP_STATUS_UNSUPPORTED, "contentType", target)]
        return super().validate(target, caption, media, context)

    def _extra_checks(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        recipients = target.options.recipients if isinstance(target.options, WhatsAppOptions) else ()
        if not recipients:
            issues.append(self._issue(IssueCode.RECIPIENTS_REQUIRED, "options.recipients", target))
        elif len(recipients) > MAX_RECIPIENTS:
            issues.append(
                self._issue(
                    IssueCode.OPTION_INVALID,
                    "options.recipients",
                    target,
                    detail=f"Send to at most {MAX_RECIPIENTS} recipients at once.",
                )
            )
        if caption.is_empty and not media:
            issues.append(self._issue(IssueCode.CAPTION_REQUIRED, "caption", target))
        return issues
