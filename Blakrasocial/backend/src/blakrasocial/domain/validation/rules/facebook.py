"""Facebook Pages: feed post, Reel, Story. Limits: Ayrshare Facebook Pages media guidelines."""

from __future__ import annotations

from collections.abc import Mapping
from types import MappingProxyType
from typing import ClassVar

from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.domain.validation.rule import PlatformRule
from blakrasocial.domain.validation.spec import GB, MB, ContentSpec, MediaConstraints
from blakrasocial.domain.value_objects import VERTICAL_9_16

_IMAGE_EXT = frozenset({"jpg", "jpeg", "png", "gif", "bmp", "tiff"})
_VIDEO_EXT = frozenset({"mp4", "mov", "avi"})
_CAPTION = 63_206

_SPECS = MappingProxyType(
    {
        ContentType.POST: ContentSpec(
            media=(
                MediaConstraints(MediaKind.IMAGE, _IMAGE_EXT, 10 * MB),
                MediaConstraints(MediaKind.VIDEO, _VIDEO_EXT, 10 * GB, (), 1, 4 * 3600),
            ),
            min_media=0,
            max_media=10,
            max_caption_length=_CAPTION,
        ),
        ContentType.REEL: ContentSpec(
            media=(
                MediaConstraints(
                    MediaKind.VIDEO,
                    _VIDEO_EXT,
                    2 * GB,
                    (VERTICAL_9_16,),
                    3,
                    90,
                    min_width=540,
                    min_height=960,
                ),
            ),
            min_media=1,
            max_media=1,
            max_caption_length=_CAPTION,
        ),
        ContentType.STORY: ContentSpec(
            media=(
                MediaConstraints(MediaKind.IMAGE, _IMAGE_EXT, 4 * MB, (VERTICAL_9_16,)),
                MediaConstraints(
                    MediaKind.VIDEO,
                    _VIDEO_EXT,
                    4 * GB,
                    (VERTICAL_9_16,),
                    3,
                    60,
                    min_width=540,
                    min_height=960,
                ),
            ),
            min_media=1,
            max_media=1,
            caption_ignored=True,
        ),
    }
)


class FacebookRule(PlatformRule):
    platform: ClassVar[Platform] = Platform.FACEBOOK

    def specs(self) -> Mapping[ContentType, ContentSpec]:
        return _SPECS
