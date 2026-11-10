from __future__ import annotations

from datetime import datetime

import pytest

from blakrasocial.domain.entities import Post, PostTarget
from blakrasocial.domain.enums import ContentType, Platform
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import (
    VERTICAL_9_16,
    AspectRatio,
    Caption,
    IdempotencyKey,
    MediaUrl,
    PhoneNumber,
    ProfileKey,
)


def test_profile_key_is_masked_in_repr() -> None:
    key = ProfileKey("ABCD-secret-value-WXYZ")
    assert "secret" not in repr(key)
    assert repr(key) == "ProfileKey(ABCD…WXYZ)"


def test_media_url_must_be_https() -> None:
    with pytest.raises(InvalidValue):
        MediaUrl("http://example.com/a.jpg")
    assert MediaUrl("https://example.com/a.jpg").host == "example.com"


@pytest.mark.parametrize("raw", ["+1 (415) 555-1234", "14155551234", "+98 912 123 4567"])
def test_phone_number_normalizes_to_e164_digits(raw: str) -> None:
    assert PhoneNumber.parse(raw).digits.isdigit()


@pytest.mark.parametrize("raw", ["", "abc", "+0123", "1" * 16])
def test_phone_number_rejects_invalid(raw: str) -> None:
    with pytest.raises(InvalidValue):
        PhoneNumber.parse(raw)


def test_idempotency_key_format() -> None:
    IdempotencyKey("3f1c2a9e-1b2c-4d5e-8f90-123456789abc")
    with pytest.raises(InvalidValue):
        IdempotencyKey("short")
    with pytest.raises(InvalidValue):
        IdempotencyKey("has spaces in it")


def test_aspect_ratio_tolerance() -> None:
    assert VERTICAL_9_16.contains(AspectRatio(1080, 1920))
    assert VERTICAL_9_16.contains(AspectRatio(1080, 1918))  # encoder rounding
    assert not VERTICAL_9_16.contains(AspectRatio(1080, 1350))
    assert AspectRatio(1080, 1920).label() == "9:16"


def test_caption_counts() -> None:
    caption = Caption("Hi @blakra and @team #launch #ai email@x.com")
    assert caption.hashtag_count() == 2
    assert caption.mention_count() == 2


def test_post_rejects_duplicate_platforms_and_naive_dates() -> None:
    target = PostTarget(Platform.TIKTOK, ContentType.VIDEO)
    with pytest.raises(InvalidValue):
        Post(Caption(""), (), (target, target))
    with pytest.raises(InvalidValue):
        Post(Caption(""), (), (target,), schedule_at=datetime(2030, 1, 1))
    with pytest.raises(InvalidValue):
        Post(Caption(""), (), ())
