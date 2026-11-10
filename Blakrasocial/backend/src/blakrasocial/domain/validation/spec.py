from __future__ import annotations

from dataclasses import dataclass

from blakrasocial.domain.enums import MediaKind
from blakrasocial.domain.value_objects import AspectRatioRange

MB = 1024 * 1024
GB = 1024 * MB


@dataclass(frozen=True, slots=True)
class MediaConstraints:
    """Limits for one kind of file inside one content type."""

    kind: MediaKind
    extensions: frozenset[str]
    max_size_bytes: int
    aspect_ratios: tuple[AspectRatioRange, ...] = ()
    min_duration_s: float | None = None
    max_duration_s: float | None = None
    min_width: int | None = None
    min_height: int | None = None


@dataclass(frozen=True, slots=True)
class ContentSpec:
    """Everything a network demands for one content type. Pure data, shared with the UI."""

    media: tuple[MediaConstraints, ...]
    min_media: int = 0
    max_media: int = 1
    allow_mixed_kinds: bool = False
    max_caption_length: int | None = None
    caption_required: bool = False
    caption_ignored: bool = False
    max_hashtags: int | None = None
    max_mentions: int | None = None
    schedulable: bool = True

    def constraints_for(self, kind: MediaKind) -> MediaConstraints | None:
        return next((c for c in self.media if c.kind is kind), None)

    @property
    def accepted_kinds(self) -> frozenset[MediaKind]:
        return frozenset(c.kind for c in self.media)
