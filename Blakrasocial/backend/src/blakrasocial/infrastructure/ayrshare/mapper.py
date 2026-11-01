"""The only module that knows Ayrshare's field names. Pure functions, easy to unit test."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from blakrasocial.domain.entities import (
    ConnectedAccount,
    FacebookOptions,
    InstagramOptions,
    LinkedInOptions,
    PlatformPublishResult,
    Post,
    PostStatus,
    PostTarget,
    TikTokOptions,
)
from blakrasocial.domain.enums import ContentType, MediaKind, Platform, PublishState
from blakrasocial.domain.value_objects import PostId

_PLATFORM_VALUES = {p.value for p in Platform}
UPLOAD_EXTENSION_BY_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
}


# ------------------------------------------------------------------ requests


def post_body(post: Post, idempotency_key: str) -> dict[str, Any]:
    body: dict[str, Any] = {
        "post": post.caption.text,
        "platforms": [t.platform.value for t in post.targets],
        "idempotencyKey": idempotency_key,
    }
    if post.media:
        body["mediaUrls"] = [m.url.value for m in post.media]
        if any(m.kind is MediaKind.VIDEO and m.extension not in {"mp4", "mov"} for m in post.media):
            body["isVideo"] = True
    if post.schedule_at is not None:
        body["scheduleDate"] = post.schedule_at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    for target in post.targets:
        key, options = _platform_options(target, post)
        if options:
            body[key] = options
    return body


def _platform_options(target: PostTarget, post: Post) -> tuple[str, dict[str, Any]]:
    match target.platform:
        case Platform.INSTAGRAM:
            return "instagramOptions", _instagram(target)
        case Platform.FACEBOOK:
            return "faceBookOptions", _facebook(target)
        case Platform.TIKTOK:
            return "tikTokOptions", _tiktok(target)
        case Platform.LINKEDIN:
            return "linkedInOptions", _linkedin(target)
        case _:
            return "", {}


def _instagram(target: PostTarget) -> dict[str, Any]:
    opts = target.options if isinstance(target.options, InstagramOptions) else InstagramOptions()
    result: dict[str, Any] = {}
    if target.content_type is ContentType.STORY:
        result["stories"] = True
        return result
    if target.content_type is ContentType.REEL:
        result["shareReelsFeed"] = opts.share_reels_to_feed
        if opts.cover_image_url:
            result["thumbNail"] = opts.cover_image_url
        elif opts.thumbnail_offset_ms is not None:
            result["thumbNailOffset"] = opts.thumbnail_offset_ms
    if opts.collaborators:
        result["collaborators"] = list(opts.collaborators[:3])
    if opts.is_ai_generated:
        result["isAIGenerated"] = True
    return result


def _facebook(target: PostTarget) -> dict[str, Any]:
    opts = target.options if isinstance(target.options, FacebookOptions) else FacebookOptions()
    result: dict[str, Any] = {}
    if target.content_type is ContentType.REEL:
        result["reels"] = True
    elif target.content_type is ContentType.STORY:
        result["stories"] = True
    if opts.title and target.content_type is not ContentType.STORY:
        result["title"] = opts.title[:255]
    if opts.thumbnail_url and target.content_type is not ContentType.STORY:
        result["thumbNail"] = opts.thumbnail_url
    return result


def _tiktok(target: PostTarget) -> dict[str, Any]:
    opts = target.options if isinstance(target.options, TikTokOptions) else TikTokOptions()
    result: dict[str, Any] = {
        "visibility": opts.visibility.value,
        "disableComments": opts.disable_comments,
        "isBrandedContent": opts.is_branded_content,
        "isBrandOrganic": opts.is_brand_organic,
    }
    if target.content_type is ContentType.VIDEO:
        result |= {
            "disableDuet": opts.disable_duet,
            "disableStitch": opts.disable_stitch,
            "isAIGenerated": opts.is_ai_generated,
        }
        if opts.thumbnail_offset_ms is not None:
            result["thumbNailOffset"] = opts.thumbnail_offset_ms
    else:
        result |= {"autoAddMusic": opts.auto_add_music, "imageCoverIndex": opts.cover_index}
        if opts.title:
            result["title"] = opts.title
    return result


def _linkedin(target: PostTarget) -> dict[str, Any]:
    opts = target.options if isinstance(target.options, LinkedInOptions) else LinkedInOptions()
    result: dict[str, Any] = {"visibility": opts.visibility.value}
    if opts.disable_share:
        result["disableShare"] = True
    if target.content_type is ContentType.DOCUMENT and opts.document_title:
        result["title"] = opts.document_title[:400]
    return result


# ------------------------------------------------------------------ responses


def parse_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, dict):  # Firestore-style {"_seconds": ..., "_nanoseconds": ...}
        seconds = value.get("_seconds") or value.get("seconds")
        return datetime.fromtimestamp(int(seconds), UTC) if seconds is not None else None
    if isinstance(value, int | float):
        return datetime.fromtimestamp(value, UTC)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _known_platform(value: Any) -> Platform | None:
    return Platform(value) if value in _PLATFORM_VALUES else None


def post_status(body: dict[str, Any], requested: list[Platform] | None = None) -> PostStatus:
    """Builds a PostStatus from /post, /post/:id, /history items and webhook payloads."""
    if isinstance(body.get("posts"), list) and body["posts"]:
        body = body["posts"][0]

    overall = str(body.get("status", "")).lower()
    schedule_at = parse_datetime(body.get("scheduleDate"))
    is_future = schedule_at is not None and schedule_at > datetime.now(UTC)

    by_platform: dict[Platform, PlatformPublishResult] = {}
    for item in body.get("postIds") or []:
        platform = _known_platform(item.get("platform"))
        if platform is None:
            continue
        ok = str(item.get("status", "")).lower() == "success"
        by_platform[platform] = PlatformPublishResult(
            platform=platform,
            state=PublishState.PUBLISHED if ok else PublishState.FAILED,
            provider_post_id=_str_or_none(item.get("id")),
            live_url=item.get("postUrl"),
            error=None if ok else item.get("message"),
        )
    for error in body.get("errors") or []:
        platform = _known_platform(error.get("platform"))
        if platform is None:
            continue
        by_platform[platform] = PlatformPublishResult(
            platform=platform, state=PublishState.FAILED, error=error.get("message")
        )

    platforms = requested or [p for p in (_known_platform(v) for v in body.get("platforms") or []) if p is not None]
    if overall == "deleted":
        fallback = PublishState.DELETED
    elif overall == "scheduled" or (overall == "pending" and is_future):
        fallback = PublishState.SCHEDULED
    else:
        fallback = PublishState.PENDING
    for platform in platforms:
        by_platform.setdefault(platform, PlatformPublishResult(platform=platform, state=fallback))

    results = tuple(by_platform.values())
    return PostStatus(
        id=PostId(str(body.get("id") or body.get("refId") or "unknown")),
        state=_overall(results, overall),
        created_at=parse_datetime(body.get("created")),
        schedule_at=schedule_at,
        caption=str(body.get("post") or ""),
        media_urls=tuple(body.get("mediaUrls") or ()),
        results=results,
    )


def _overall(results: tuple[PlatformPublishResult, ...], provider_status: str) -> PublishState:
    states = {r.state for r in results}
    if provider_status == "deleted":
        return PublishState.DELETED
    if not states:
        return PublishState.PENDING
    if len(states) == 1:
        return next(iter(states))
    if PublishState.FAILED in states and PublishState.PUBLISHED in states:
        return PublishState.PARTIAL
    return PublishState.PENDING


def connected_accounts(body: dict[str, Any]) -> list[ConnectedAccount]:
    accounts: list[ConnectedAccount] = []
    for item in body.get("displayNames") or []:
        platform = _known_platform(item.get("platform"))
        if platform is None:
            continue
        name = item.get("displayName") or item.get("pageName") or item.get("username") or platform.value
        days_left = item.get("refreshDaysRemaining")
        accounts.append(
            ConnectedAccount(
                platform=platform,
                display_name=str(name),
                username=item.get("username"),
                avatar_url=item.get("userImage"),
                profile_url=item.get("profileUrl"),
                account_type=item.get("type"),
                needs_reconnect=isinstance(days_left, int | float) and days_left <= 0,
            )
        )
    return accounts


def _str_or_none(value: Any) -> str | None:
    return None if value is None else str(value)
