from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.application.errors import MediaRejected, ProviderRejected
from blakrasocial.domain.entities import (
    ConnectedAccount,
    ConnectUrl,
    MediaUploadTicket,
    Post,
    PostStatus,
)
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import IdempotencyKey, PostId, ProfileKey
from blakrasocial.infrastructure.ayrshare import mapper
from blakrasocial.infrastructure.ayrshare.client import AyrshareClient
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)
_UPLOAD_URL_LIFETIME = timedelta(hours=1)
_LINKABLE = [p.value for p in (Platform.INSTAGRAM, Platform.FACEBOOK, Platform.TIKTOK, Platform.LINKEDIN)]


class AyrsharePublisher:
    """`SocialPublisher` backed by Ayrshare's Business API (one User Profile per customer)."""

    def __init__(
        self,
        client: AyrshareClient,
        *,
        link_domain: str | None = None,
        instagram_link_method: str = "facebook",
        webhook_url: str | None = None,
        webhook_secret: str | None = None,
        messaging_enabled: bool = False,
    ) -> None:
        self._client = client
        self._link_domain = link_domain
        self._instagram_link_method = instagram_link_method
        self._webhook_url = webhook_url
        self._webhook_secret = webhook_secret
        self._messaging_enabled = messaging_enabled

    # ------------------------------------------------------------ profiles

    async def create_profile(self, title: str) -> ProfileKey:
        body = await self._client.call(
            "POST",
            "/profiles",
            json={"title": title, "messagingActive": self._messaging_enabled},
            idempotent=False,
        )
        profile = ProfileKey(str(body["profileKey"]))
        await self._register_webhook(profile)
        return profile

    async def _register_webhook(self, profile: ProfileKey) -> None:
        if not (self._webhook_url and self._webhook_secret):
            return
        try:
            await self._client.call(
                "POST",
                "/hook/webhook",
                profile=profile,
                json={"action": "scheduled", "url": self._webhook_url, "secret": self._webhook_secret},
                idempotent=True,
            )
        except ProviderRejected as exc:  # profile still works; results remain pollable
            _log.error("webhook_registration_failed", profile=profile.masked(), error=exc.message)

    # ------------------------------------------------------------ accounts

    async def get_connect_url(self, profile: ProfileKey, redirect_url: str | None, origin: str | None) -> ConnectUrl:
        payload: dict[str, Any] = {
            "mode": "grid",
            "instagramLinkMethod": self._instagram_link_method,
            "allowedSocial": _LINKABLE,
        }
        if redirect_url:
            payload["redirect"] = redirect_url
        if self._link_domain:
            payload["domain"] = self._link_domain
        body = await self._client.call(
            "POST", "/profiles/link-sessions", profile=profile, json=payload, idempotent=True
        )
        return ConnectUrl(url=str(body["url"]), expires_at=mapper.parse_datetime(body.get("expiresAt")))

    async def get_connected_accounts(self, profile: ProfileKey) -> list[ConnectedAccount]:
        body = await self._client.call("GET", "/user", profile=profile)
        return mapper.connected_accounts(body or {})

    async def unlink_account(self, profile: ProfileKey, platform: Platform) -> None:
        await self._client.call("DELETE", "/profiles/social", profile=profile, json={"platform": platform.value})

    # ------------------------------------------------------------ media

    async def upload_media(self, profile: ProfileKey, file_name: str, content_type: str) -> MediaUploadTicket:
        extension = mapper.UPLOAD_EXTENSION_BY_MIME.get(content_type)
        if extension is None:
            raise MediaRejected(f"'{content_type}' cannot be uploaded.", field="contentType")
        body = await self._client.call(
            "GET", "/media/uploadUrl", params={"fileName": file_name, "contentType": extension}
        )
        return MediaUploadTicket(
            upload_url=str(body["uploadUrl"]),
            access_url=str(body["accessUrl"]),
            content_type=str(body.get("contentType") or content_type),
            expires_at=datetime.now(UTC) + _UPLOAD_URL_LIFETIME,
        )

    # ------------------------------------------------------------ posts

    async def publish(self, profile: ProfileKey, post: Post, idempotency_key: IdempotencyKey) -> PostStatus:
        body = await self._client.call(
            "POST",
            "/post",
            profile=profile,
            json=mapper.post_body(post, idempotency_key.value),
            idempotent=True,  # safe to retry: Ayrshare rejects a repeated idempotencyKey
        )
        status = mapper.post_status(body, requested=[t.platform for t in post.targets])
        _log.info("post_published", post_id=status.id.value, state=status.state.value)
        return status

    async def delete_post(self, profile: ProfileKey, post_id: PostId) -> None:
        await self._client.call("DELETE", "/post", profile=profile, json={"id": post_id.value})

    async def get_post_status(self, profile: ProfileKey, post_id: PostId) -> PostStatus:
        body = await self._client.call("GET", f"/post/{post_id.value}", profile=profile)
        return mapper.post_status(body)

    async def list_posts(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]:
        params: dict[str, Any] = {"limit": query.limit, "lastDays": query.last_days}
        if query.platform is not None:
            params["platforms"] = query.platform.value
        body = await self._client.call("GET", "/history", profile=profile, params=params, not_found_ok=True)
        history = (body or {}).get("history") or []
        items = tuple(mapper.post_status(item) for item in history)
        return Page(items=items, total=(body or {}).get("count"))
