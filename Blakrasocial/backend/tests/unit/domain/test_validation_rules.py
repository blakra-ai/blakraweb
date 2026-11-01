from __future__ import annotations

import pytest

from blakrasocial.domain.entities import (
    LinkedInOptions,
    MediaAsset,
    Post,
    PostTarget,
    TikTokOptions,
    WhatsAppOptions,
)
from blakrasocial.domain.enums import (
    ContentType,
    IssueSeverity,
    LinkedInVisibility,
    MediaKind,
    Platform,
    TikTokVisibility,
)
from blakrasocial.domain.validation import IssueCode, PlatformRuleRegistry, ValidationContext
from blakrasocial.domain.value_objects import Caption, MediaUrl, PhoneNumber
from tests.fakes import account

MB = 1024 * 1024


def video(width: int = 1080, height: int = 1920, seconds: float = 30, size: int = 20 * MB, ext: str = "mp4"):  # type: ignore[no-untyped-def]
    return MediaAsset(
        MediaUrl(f"https://m.example.com/v.{ext}"), MediaKind.VIDEO, "video/mp4", size, width, height, seconds
    )


def image(width: int = 1080, height: int = 1080, size: int = 1 * MB, ext: str = "jpg"):  # type: ignore[no-untyped-def]
    return MediaAsset(MediaUrl(f"https://m.example.com/i.{ext}"), MediaKind.IMAGE, "image/jpeg", size, width, height)


def codes(
    registry: PlatformRuleRegistry, target: PostTarget, media=(), caption: str = "Hello", ctx=None
) -> set[IssueCode]:  # type: ignore[no-untyped-def]
    context = ctx or ValidationContext(check_connections=False)
    post = Post(Caption(caption), tuple(media), (target,))
    return {i.code for i in registry.validate(post, context) if i.severity is IssueSeverity.ERROR}


@pytest.mark.parametrize(
    ("platform", "content_type"),
    [
        (Platform.INSTAGRAM, ContentType.REEL),
        (Platform.INSTAGRAM, ContentType.STORY),
        (Platform.FACEBOOK, ContentType.REEL),
        (Platform.FACEBOOK, ContentType.STORY),
        (Platform.TIKTOK, ContentType.VIDEO),
    ],
)
def test_vertical_formats_require_9_16(registry, platform, content_type) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(platform, content_type)
    assert codes(registry, target, [video()]) == set()
    assert IssueCode.ASPECT_RATIO in codes(registry, target, [video(1920, 1080)])


def test_instagram_reel_duration_limits(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.INSTAGRAM, ContentType.REEL)
    assert IssueCode.DURATION_TOO_SHORT in codes(registry, target, [video(seconds=2)])
    assert IssueCode.DURATION_TOO_LONG in codes(registry, target, [video(seconds=901)])


def test_instagram_story_video_max_60s_and_caption_ignored_warning(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.INSTAGRAM, ContentType.STORY)
    assert IssueCode.DURATION_TOO_LONG in codes(registry, target, [video(seconds=61)])
    post = Post(Caption("ignored"), (video(),), (target,))
    issues = registry.validate(post, ValidationContext(check_connections=False))
    assert [(i.code, i.severity) for i in issues] == [(IssueCode.CAPTION_IGNORED, IssueSeverity.WARNING)]


def test_instagram_caption_limits(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.INSTAGRAM, ContentType.POST)
    assert IssueCode.CAPTION_TOO_LONG in codes(registry, target, [image()], "x" * 2201)
    assert IssueCode.TOO_MANY_HASHTAGS in codes(registry, target, [image()], "#a #b #c #d #e #f")
    assert IssueCode.TOO_MANY_MENTIONS in codes(registry, target, [image()], "@a @b @c @d")


def test_instagram_feed_image_ratio_and_size(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.INSTAGRAM, ContentType.POST)
    assert codes(registry, target, [image(1080, 1350)]) == set()  # 4:5
    assert IssueCode.ASPECT_RATIO in codes(registry, target, [image(1080, 3000)])
    assert IssueCode.FILE_TOO_LARGE in codes(registry, target, [image(size=9 * MB)])


def test_instagram_carousel_needs_2_to_10(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.INSTAGRAM, ContentType.CAROUSEL)
    assert IssueCode.MEDIA_COUNT in codes(registry, target, [image()])
    assert codes(registry, target, [image(), video(1080, 1080)]) == set()
    assert IssueCode.MEDIA_COUNT in codes(registry, target, [image()] * 11)


def test_instagram_requires_professional_account_and_business_for_stories(registry) -> None:  # type: ignore[no-untyped-def]
    personal = ValidationContext(accounts={Platform.INSTAGRAM: account(Platform.INSTAGRAM, "personal")})
    creator = ValidationContext(accounts={Platform.INSTAGRAM: account(Platform.INSTAGRAM, "creator")})
    reel = PostTarget(Platform.INSTAGRAM, ContentType.REEL)
    story = PostTarget(Platform.INSTAGRAM, ContentType.STORY)
    assert IssueCode.ACCOUNT_TYPE_UNSUPPORTED in codes(registry, reel, [video()], ctx=personal)
    assert codes(registry, reel, [video()], ctx=creator) == set()
    assert IssueCode.ACCOUNT_TYPE_UNSUPPORTED in codes(registry, story, [video()], "", ctx=creator)


def test_unknown_content_type_lists_allowed(registry) -> None:  # type: ignore[no-untyped-def]
    post = Post(Caption("x"), (video(),), (PostTarget(Platform.TIKTOK, ContentType.STORY),))
    [issue] = registry.validate(post, ValidationContext(check_connections=False))
    assert issue.code is IssueCode.CONTENT_TYPE_UNSUPPORTED
    assert "photo, video" in issue.message


def test_missing_connection_is_reported(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.LINKEDIN, ContentType.POST)
    assert IssueCode.ACCOUNT_NOT_CONNECTED in codes(registry, target, ctx=ValidationContext(accounts={}))


def test_tiktok_photo_rules(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.TIKTOK, ContentType.PHOTO, TikTokOptions(cover_index=0))
    assert codes(registry, target, [image()] * 3) == set()
    assert IssueCode.MEDIA_FORMAT in codes(registry, target, [image(ext="png")])
    assert IssueCode.MEDIA_KIND in codes(registry, target, [video()])
    bad_cover = PostTarget(Platform.TIKTOK, ContentType.PHOTO, TikTokOptions(cover_index=5))
    assert IssueCode.OPTION_INVALID in codes(registry, bad_cover, [image()])


def test_tiktok_branded_content_cannot_be_private(registry) -> None:  # type: ignore[no-untyped-def]
    options = TikTokOptions(visibility=TikTokVisibility.PRIVATE, is_branded_content=True)
    assert IssueCode.OPTION_INVALID in codes(
        registry, PostTarget(Platform.TIKTOK, ContentType.VIDEO, options), [video()]
    )


def test_linkedin_text_post_document_and_visibility(registry) -> None:  # type: ignore[no-untyped-def]
    assert codes(registry, PostTarget(Platform.LINKEDIN, ContentType.POST)) == set()
    assert IssueCode.CAPTION_REQUIRED in codes(registry, PostTarget(Platform.LINKEDIN, ContentType.POST), caption="")
    assert IssueCode.CAPTION_TOO_LONG in codes(
        registry, PostTarget(Platform.LINKEDIN, ContentType.POST), caption="x" * 3001
    )
    doc = MediaAsset(MediaUrl("https://m.example.com/deck.pdf"), MediaKind.DOCUMENT, "application/pdf", 2 * MB)
    assert codes(registry, PostTarget(Platform.LINKEDIN, ContentType.DOCUMENT), [doc]) == set()
    company = ValidationContext(accounts={Platform.LINKEDIN: account(Platform.LINKEDIN, "corporate")})
    target = PostTarget(Platform.LINKEDIN, ContentType.POST, LinkedInOptions(visibility=LinkedInVisibility.CONNECTIONS))
    assert IssueCode.OPTION_INVALID in codes(registry, target, ctx=company)


def test_whatsapp_status_is_rejected_explicitly(registry) -> None:  # type: ignore[no-untyped-def]
    target = PostTarget(Platform.WHATSAPP, ContentType.STORY)
    assert codes(registry, target, [image()]) == {IssueCode.WHATSAPP_STATUS_UNSUPPORTED}


def test_whatsapp_message_needs_recipients_and_cannot_be_scheduled(registry) -> None:  # type: ignore[no-untyped-def]
    no_recipients = PostTarget(Platform.WHATSAPP, ContentType.MESSAGE)
    assert IssueCode.RECIPIENTS_REQUIRED in codes(registry, no_recipients)
    target = PostTarget(
        Platform.WHATSAPP, ContentType.MESSAGE, WhatsAppOptions((PhoneNumber.parse("+1 415 555 1234"),))
    )
    assert codes(registry, target) == set()
    scheduled = ValidationContext(check_connections=False, is_scheduled=True)
    assert IssueCode.SCHEDULE_UNSUPPORTED in codes(registry, target, ctx=scheduled)
    assert IssueCode.FILE_TOO_LARGE in codes(registry, target, [image(size=6 * MB)])


def test_all_issues_are_returned_at_once(registry) -> None:  # type: ignore[no-untyped-def]
    post = Post(
        Caption("x" * 2300),
        (video(1920, 1080, seconds=1),),
        (PostTarget(Platform.INSTAGRAM, ContentType.REEL), PostTarget(Platform.TIKTOK, ContentType.VIDEO)),
    )
    issues = registry.validate(post, ValidationContext(check_connections=False))
    assert {(i.platform, i.code) for i in issues} >= {
        (Platform.INSTAGRAM, IssueCode.ASPECT_RATIO),
        (Platform.INSTAGRAM, IssueCode.DURATION_TOO_SHORT),
        (Platform.INSTAGRAM, IssueCode.CAPTION_TOO_LONG),
        (Platform.TIKTOK, IssueCode.ASPECT_RATIO),
        (Platform.TIKTOK, IssueCode.CAPTION_TOO_LONG),
    }
