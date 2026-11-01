from __future__ import annotations

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.domain.validation import ContentSpec, PlatformRuleRegistry


class MediaConstraintsOut(CamelModel):
    kind: MediaKind
    extensions: list[str]
    max_size_bytes: int
    aspect_ratios: list[str]
    aspect_ratio_ranges: list[tuple[float, float]]
    min_duration_s: float | None
    max_duration_s: float | None
    min_width: int | None
    min_height: int | None


class ContentSpecOut(CamelModel):
    content_type: ContentType
    media: list[MediaConstraintsOut]
    min_media: int
    max_media: int
    allow_mixed_kinds: bool
    max_caption_length: int | None
    caption_ignored: bool
    max_hashtags: int | None
    max_mentions: int | None
    schedulable: bool


class PlatformRulesOut(CamelModel):
    platform: Platform
    content_types: list[ContentSpecOut]


class PlatformRulesResponse(CamelModel):
    platforms: list[PlatformRulesOut]

    @classmethod
    def from_registry(cls, registry: PlatformRuleRegistry) -> PlatformRulesResponse:
        return cls(
            platforms=[
                PlatformRulesOut(
                    platform=platform,
                    content_types=[_spec(ct, spec) for ct, spec in rule.specs().items()],
                )
                for platform, rule in registry.all().items()
            ]
        )


def _spec(content_type: ContentType, spec: ContentSpec) -> ContentSpecOut:
    return ContentSpecOut(
        content_type=content_type,
        media=[
            MediaConstraintsOut(
                kind=c.kind,
                extensions=sorted(c.extensions),
                max_size_bytes=c.max_size_bytes,
                aspect_ratios=[r.label for r in c.aspect_ratios],
                aspect_ratio_ranges=[(r.minimum, r.maximum) for r in c.aspect_ratios],
                min_duration_s=c.min_duration_s,
                max_duration_s=c.max_duration_s,
                min_width=c.min_width,
                min_height=c.min_height,
            )
            for c in spec.media
        ],
        min_media=spec.min_media,
        max_media=spec.max_media,
        allow_mixed_kinds=spec.allow_mixed_kinds,
        max_caption_length=spec.max_caption_length,
        caption_ignored=spec.caption_ignored,
        max_hashtags=spec.max_hashtags,
        max_mentions=spec.max_mentions,
        schedulable=spec.schedulable,
    )
