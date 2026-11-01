"""TikTok Login Kit + Content Posting API (Direct Post).

Until TikTok audits the app, every post is forced to "Only me" by TikTok itself; we say so clearly
instead of failing with TikTok's raw error code.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from blakrasocial.application.errors import (
    ApplicationError,
    ProviderAuthError,
    ProviderRateLimited,
    ProviderRejected,
)
from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.domain.entities import ConnectedAccount, MediaAsset, OAuthCredential, PostTarget, TikTokOptions
from blakrasocial.domain.enums import ContentType, MediaKind, Platform, TikTokVisibility
from blakrasocial.infrastructure.networks.http import MediaSource, NetworkApi, default_error

AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/"
API = "https://open.tiktokapis.com/v2"
SCOPES = ("user.info.basic", "video.publish")
MIN_CHUNK = 5 * 1024 * 1024
CHUNK = 10 * 1024 * 1024

_PRIVACY = {
    TikTokVisibility.PUBLIC: "PUBLIC_TO_EVERYONE",
    TikTokVisibility.FRIENDS: "MUTUAL_FOLLOW_FRIENDS",
    TikTokVisibility.FOLLOWERS: "FOLLOWER_OF_CREATOR",
    TikTokVisibility.PRIVATE: "SELF_ONLY",
}
_AUTH = frozenset({"access_token_invalid", "scope_not_authorized", "scope_permission_missed", "invalid_grant"})
_RATE = frozenset({"rate_limit_exceeded"})
_FRIENDLY = {
    "unaudited_client_can_only_post_to_private_accounts": (
        "TikTok allows only 'Only me' posts until our app passes TikTok's review. Choose 'Only me' for now."
    ),
    "spam_risk_too_many_posts": "TikTok's daily post limit for this account was reached. Try again tomorrow.",
    "spam_risk_user_banned_from_posting": "TikTok has blocked this account from posting.",
    "reached_active_user_cap": "TikTok's daily limit of posting users for our app was reached. Try again tomorrow.",
    "url_ownership_unverified": "Our file storage domain isn't verified with TikTok yet (needed for photo posts).",
    "privacy_level_option_mismatch": "This TikTok account doesn't allow the chosen audience. Pick another one.",
}


def translate(status: int, body: Any, headers: httpx.Headers) -> ApplicationError | None:
    error = body.get("error") if isinstance(body, dict) else None
    if isinstance(error, dict):
        code = str(error.get("code") or "ok")
        if code == "ok" and status < 400:
            return None
        message = _FRIENDLY.get(code) or str(error.get("message") or f"TikTok error: {code}")
        if code in _AUTH:
            return ProviderAuthError(message, code)
        if code in _RATE:
            return ProviderRateLimited(message)
        if status >= 500:
            return default_error("TikTok", status, message, headers)
        return ProviderRejected(message, code)
    if isinstance(error, str):  # OAuth endpoint shape: {"error": "...", "error_description": "..."}
        message = str(body.get("error_description") or error)
        return ProviderAuthError(message, error) if error in _AUTH else ProviderRejected(message, error)
    if status >= 400:
        return default_error("TikTok", status, None, headers)
    return None


class TikTokOAuth:
    platform = Platform.TIKTOK
    uses_pkce = False
    refresh_ahead = timedelta(hours=6)  # access tokens last 24 h; refresh tokens 365 days

    def __init__(self, api: NetworkApi, client_key: str, client_secret: str) -> None:
        self._api = api
        self._client_key = client_key
        self._client_secret = client_secret

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str:
        query = {
            "client_key": self._client_key,
            "scope": ",".join(SCOPES),
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return f"{AUTHORIZE_URL}?{urlencode(query)}"

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        token = await self._token({"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri})
        info = await self._api.call(
            "GET",
            f"{API}/user/info/",
            params={"fields": "open_id,avatar_url,display_name"},
            headers={"Authorization": f"Bearer {token['access_token']}"},
        )
        user = (info.body.get("data") or {}).get("user") or {}
        return [
            self._credential(
                token,
                ConnectedAccount(
                    Platform.TIKTOK,
                    display_name=user.get("display_name") or "TikTok",
                    avatar_url=user.get("avatar_url"),
                ),
            )
        ]

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        if not credential.refresh_token:
            raise ProviderAuthError("TikTok access expired. Connect TikTok again.")
        token = await self._token({"grant_type": "refresh_token", "refresh_token": credential.refresh_token})
        return self._credential(token, credential.account)

    async def _token(self, grant: dict[str, str]) -> dict[str, Any]:
        response = await self._api.call(
            "POST",
            f"{API}/oauth/token/",
            data={"client_key": self._client_key, "client_secret": self._client_secret, **grant},
            idempotent=False,
        )
        body: dict[str, Any] = response.body
        return body

    @staticmethod
    def _credential(token: dict[str, Any], account: ConnectedAccount) -> OAuthCredential:
        now = datetime.now(UTC)
        return OAuthCredential(
            platform=Platform.TIKTOK,
            account_id=str(token["open_id"]),
            account=account,
            access_token=str(token["access_token"]),
            refresh_token=token.get("refresh_token"),
            expires_at=now + timedelta(seconds=int(token.get("expires_in", 86_400))),
            refresh_expires_at=now + timedelta(seconds=int(token.get("refresh_expires_in", 31_536_000))),
            scopes=tuple(str(token.get("scope", "")).split(",")),
        )


class TikTokConnector:
    can_delete = False  # TikTok's API has no delete

    def __init__(self, api: NetworkApi, media: MediaSource) -> None:
        self._api = api
        self._media = media

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult:
        options = target.options if isinstance(target.options, TikTokOptions) else TikTokOptions()
        creator = (await self._call(credential, "/post/publish/creator_info/query/", {})).get("data") or {}
        privacy = _PRIVACY[options.visibility]
        allowed = creator.get("privacy_level_options") or []
        if allowed and privacy not in allowed:
            if allowed == ["SELF_ONLY"]:
                raise ProviderRejected(_FRIENDLY["unaudited_client_can_only_post_to_private_accounts"])
            raise ProviderRejected(_FRIENDLY["privacy_level_option_mismatch"])

        post_info: dict[str, Any] = {
            "privacy_level": privacy,
            "disable_comment": options.disable_comments or bool(creator.get("comment_disabled")),
            "brand_content_toggle": options.is_branded_content,
            "brand_organic_toggle": options.is_brand_organic,
        }
        if target.content_type is ContentType.PHOTO:
            images = [m.url.value for m in media if m.kind is MediaKind.IMAGE]
            post_info |= {
                "title": (options.title or "")[:90],
                "description": caption[:4000],
                "auto_add_music": options.auto_add_music,
            }
            body = {
                "post_info": post_info,
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "photo_cover_index": options.cover_index,
                    "photo_images": images,
                },
                "post_mode": "DIRECT_POST",
                "media_type": "PHOTO",
            }
            created = await self._call(credential, "/post/publish/content/init/", body)
            return ConnectorResult.processing(str(created["data"]["publish_id"]), timedelta(seconds=10))

        video = next((m for m in media if m.kind is MediaKind.VIDEO), None)
        if video is None:
            raise ProviderRejected("TikTok needs one video (or choose a photo post).")
        max_seconds = creator.get("max_video_post_duration_sec")
        if max_seconds and video.duration_seconds and video.duration_seconds > float(max_seconds):
            raise ProviderRejected(f"This TikTok account allows videos up to {int(max_seconds)} seconds.")
        post_info |= {
            "title": caption[:2200],
            "disable_duet": options.disable_duet or bool(creator.get("duet_disabled")),
            "disable_stitch": options.disable_stitch or bool(creator.get("stitch_disabled")),
            "is_aigc": options.is_ai_generated,
        }
        if options.thumbnail_offset_ms is not None:
            post_info["video_cover_timestamp_ms"] = options.thumbnail_offset_ms
        chunk_size, count = chunk_plan(video.size_bytes)
        created = await self._call(
            credential,
            "/post/publish/video/init/",
            {
                "post_info": post_info,
                "source_info": {
                    "source": "FILE_UPLOAD",
                    "video_size": video.size_bytes,
                    "chunk_size": chunk_size,
                    "total_chunk_count": count,
                },
            },
        )
        data = created["data"]
        await self._upload(data["upload_url"], video, chunk_size, count)
        return ConnectorResult.processing(str(data["publish_id"]), timedelta(seconds=15))

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult:
        found = (await self._call(credential, "/post/publish/status/fetch/", {"publish_id": handle})).get("data") or {}
        status = found.get("status")
        if status == "PUBLISH_COMPLETE":
            ids = found.get("publicaly_available_post_id") or found.get("publicly_available_post_id") or []
            post_id = str(ids[0]) if ids else handle
            return ConnectorResult.published(post_id, f"https://www.tiktok.com/video/{ids[0]}" if ids else None)
        if status == "FAILED":
            reason = str(found.get("fail_reason") or "unknown")
            return ConnectorResult.failed(_FRIENDLY.get(reason, f"TikTok couldn't publish the post ({reason})."))
        return ConnectorResult.processing(handle)

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None:
        raise ProviderRejected("TikTok doesn't allow deleting posts through its API.")

    async def _call(self, credential: OAuthCredential, path: str, body: dict[str, Any]) -> dict[str, Any]:
        response = await self._api.call(
            "POST",
            f"{API}{path}",
            headers={
                "Authorization": f"Bearer {credential.access_token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json=body,
            idempotent=path.endswith(("/query/", "/fetch/")),
        )
        result: dict[str, Any] = response.body
        return result

    async def _upload(self, upload_url: str, video: MediaAsset, chunk_size: int, count: int) -> None:
        total = video.size_bytes
        start = 0
        pending = bytearray()
        index = 0
        async for piece in self._media.chunks(video.url.value, chunk_size):
            pending.extend(piece)
            if index < count - 1:
                await self._put(upload_url, bytes(pending), start, total, video.mime_type)
                start += len(pending)
                pending.clear()
                index += 1
        if pending:  # the last chunk carries the remainder (TikTok allows it to exceed chunk_size)
            await self._put(upload_url, bytes(pending), start, total, video.mime_type)

    async def _put(self, url: str, data: bytes, start: int, total: int, mime: str) -> None:
        await self._api.call(
            "PUT",
            url,
            headers={
                "Content-Type": mime if mime in ("video/mp4", "video/quicktime", "video/webm") else "video/mp4",
                "Content-Range": f"bytes {start}-{start + len(data) - 1}/{total}",
            },
            content=data,
        )


def chunk_plan(size: int) -> tuple[int, int]:
    """TikTok: files under 5 MB go in one chunk; otherwise 5-64 MB chunks, the last one absorbing the rest."""
    if size < MIN_CHUNK:
        return size, 1
    return CHUNK if size >= CHUNK else size, max(size // CHUNK, 1)
