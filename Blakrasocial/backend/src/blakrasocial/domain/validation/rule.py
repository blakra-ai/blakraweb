from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import ClassVar

from blakrasocial.domain.entities import ConnectedAccount, MediaAsset, PostTarget
from blakrasocial.domain.enums import ContentType, IssueSeverity, Platform
from blakrasocial.domain.validation.issue import IssueCode, ValidationIssue
from blakrasocial.domain.validation.spec import MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import Caption


@dataclass(frozen=True, slots=True)
class ValidationContext:
    """Facts outside the post itself that rules may need (connected accounts, etc.)."""

    accounts: Mapping[Platform, ConnectedAccount] = field(default_factory=dict)
    is_scheduled: bool = False
    check_connections: bool = True


class PlatformRule(ABC):
    """Strategy: one subclass per network.

    `validate` is a template method. The generic checks are driven by `ContentSpec` data,
    and subclasses add network-specific checks in `_extra_checks`.
    """

    platform: ClassVar[Platform]

    @abstractmethod
    def specs(self) -> Mapping[ContentType, ContentSpec]: ...

    def supported_content_types(self) -> frozenset[ContentType]:
        return frozenset(self.specs())

    def validate(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        spec = self.specs().get(target.content_type)
        if spec is None:
            return [self._unsupported(target)]

        issues: list[ValidationIssue] = []
        issues += self._check_connection(context)
        issues += self._check_schedule(spec, target, context)
        issues += self._check_caption(spec, target, caption)
        issues += self._check_media_set(spec, target, media)
        for index, asset in enumerate(media):
            constraints = spec.constraints_for(asset.kind)
            if constraints is not None:
                issues += self._check_asset(constraints, target, asset, index)
        issues += self._extra_checks(target, caption, media, context)
        return issues

    # ---- hooks ----

    def _extra_checks(
        self,
        target: PostTarget,
        caption: Caption,
        media: Sequence[MediaAsset],
        context: ValidationContext,
    ) -> list[ValidationIssue]:
        return []

    # ---- helpers available to subclasses ----

    def _issue(
        self,
        code: IssueCode,
        field_name: str,
        target: PostTarget | None = None,
        severity: IssueSeverity = IssueSeverity.ERROR,
        **params: object,
    ) -> ValidationIssue:
        if target is not None:
            params.setdefault("contentType", target.content_type.value)
        return ValidationIssue(code, self.platform, field_name, severity, dict(params))

    # ---- generic checks ----

    def _unsupported(self, target: PostTarget) -> ValidationIssue:
        allowed = ", ".join(sorted(c.value for c in self.supported_content_types()))
        return self._issue(IssueCode.CONTENT_TYPE_UNSUPPORTED, "contentType", target, allowed=allowed)

    def _check_connection(self, context: ValidationContext) -> list[ValidationIssue]:
        if context.check_connections and self.platform not in context.accounts:
            return [self._issue(IssueCode.ACCOUNT_NOT_CONNECTED, "platform")]
        return []

    def _check_schedule(
        self, spec: ContentSpec, target: PostTarget, context: ValidationContext
    ) -> list[ValidationIssue]:
        if context.is_scheduled and not spec.schedulable:
            return [self._issue(IssueCode.SCHEDULE_UNSUPPORTED, "scheduleAt", target)]
        return []

    def _check_caption(self, spec: ContentSpec, target: PostTarget, caption: Caption) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if spec.caption_ignored and not caption.is_empty:
            issues.append(self._issue(IssueCode.CAPTION_IGNORED, "caption", target, IssueSeverity.WARNING))
            return issues
        if spec.caption_required and caption.is_empty:
            issues.append(self._issue(IssueCode.CAPTION_REQUIRED, "caption", target))
        if spec.max_caption_length is not None and caption.length > spec.max_caption_length:
            issues.append(
                self._issue(
                    IssueCode.CAPTION_TOO_LONG,
                    "caption",
                    target,
                    actual=caption.length,
                    max=spec.max_caption_length,
                )
            )
        if spec.max_hashtags is not None and caption.hashtag_count() > spec.max_hashtags:
            issues.append(
                self._issue(
                    IssueCode.TOO_MANY_HASHTAGS,
                    "caption",
                    target,
                    actual=caption.hashtag_count(),
                    max=spec.max_hashtags,
                )
            )
        if spec.max_mentions is not None and caption.mention_count() > spec.max_mentions:
            issues.append(
                self._issue(
                    IssueCode.TOO_MANY_MENTIONS,
                    "caption",
                    target,
                    actual=caption.mention_count(),
                    max=spec.max_mentions,
                )
            )
        return issues

    def _check_media_set(
        self, spec: ContentSpec, target: PostTarget, media: Sequence[MediaAsset]
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if spec.min_media > 0 and not media:
            return [self._issue(IssueCode.MEDIA_REQUIRED, "media", target)]
        if not spec.min_media <= len(media) <= spec.max_media:
            issues.append(
                self._issue(
                    IssueCode.MEDIA_COUNT,
                    "media",
                    target,
                    min=spec.min_media,
                    max=spec.max_media,
                    actual=len(media),
                )
            )
        kinds = {asset.kind for asset in media}
        if len(kinds) > 1 and not spec.allow_mixed_kinds:
            issues.append(self._issue(IssueCode.MEDIA_MIXED_KINDS, "media", target))
        for index, asset in enumerate(media):
            if asset.kind not in spec.accepted_kinds:
                issues.append(self._issue(IssueCode.MEDIA_KIND, f"media[{index}]", target, kind=asset.kind.value))
        return issues

    def _check_asset(
        self,
        constraints: MediaConstraints,
        target: PostTarget,
        asset: MediaAsset,
        index: int,
    ) -> list[ValidationIssue]:
        field_name = f"media[{index}]"
        issues: list[ValidationIssue] = []

        if asset.extension and asset.extension not in constraints.extensions:
            issues.append(
                self._issue(
                    IssueCode.MEDIA_FORMAT,
                    field_name,
                    target,
                    actual=asset.extension,
                    allowed=", ".join(sorted(constraints.extensions)),
                )
            )
        if asset.size_bytes > constraints.max_size_bytes:
            issues.append(
                self._issue(
                    IssueCode.FILE_TOO_LARGE,
                    field_name,
                    target,
                    actualMb=round(asset.size_bytes / MB, 1),
                    maxMb=round(constraints.max_size_bytes / MB, 1),
                )
            )

        issues += self._check_duration(constraints, target, asset, field_name)

        ratio = asset.aspect_ratio
        if (
            constraints.aspect_ratios
            and ratio is not None
            and not any(r.contains(ratio) for r in constraints.aspect_ratios)
        ):
            issues.append(
                self._issue(
                    IssueCode.ASPECT_RATIO,
                    field_name,
                    target,
                    expected=" or ".join(r.label for r in constraints.aspect_ratios),
                    actual=ratio.label(),
                )
            )
        if (
            asset.width is not None
            and asset.height is not None
            and constraints.min_width is not None
            and constraints.min_height is not None
            and (asset.width < constraints.min_width or asset.height < constraints.min_height)
        ):
            issues.append(
                self._issue(
                    IssueCode.RESOLUTION_TOO_LOW,
                    field_name,
                    target,
                    actual=f"{asset.width}x{asset.height}",
                    min=f"{constraints.min_width}x{constraints.min_height}",
                )
            )
        return issues

    def _check_duration(
        self,
        constraints: MediaConstraints,
        target: PostTarget,
        asset: MediaAsset,
        field_name: str,
    ) -> list[ValidationIssue]:
        if constraints.min_duration_s is None and constraints.max_duration_s is None:
            return []
        if asset.duration_seconds is None:
            return [self._issue(IssueCode.DURATION_UNKNOWN, field_name, target)]
        duration = round(asset.duration_seconds, 1)
        if constraints.min_duration_s is not None and duration < constraints.min_duration_s:
            return [
                self._issue(
                    IssueCode.DURATION_TOO_SHORT,
                    field_name,
                    target,
                    actual=duration,
                    min=constraints.min_duration_s,
                )
            ]
        if constraints.max_duration_s is not None and duration > constraints.max_duration_s:
            return [
                self._issue(
                    IssueCode.DURATION_TOO_LONG,
                    field_name,
                    target,
                    actual=duration,
                    max=constraints.max_duration_s,
                )
            ]
        return []
