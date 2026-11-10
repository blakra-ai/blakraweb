"""Instagram API with Instagram Login (graph.instagram.com): Business/Creator accounts, no Facebook Page needed."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

from blakrasocial.application.errors import ProviderRejected
from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.domain.entities import (
    ConnectedAccount,
    InstagramOptions,
    MediaAsset,
    OAuthCredential,
    PostTarget,
)
from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.infrastructure.networks.http import NetworkApi

AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize"
TOKEN_URL = "https://api.instagram.com/oauth/access_token"  # noqa: S105
GRAPH = "https://graph.instagram.com"
SCOPES = ("instagram_business_basic", "instagram_business_content_publish")
_ACCOUNT_TYPES = {"BUSINESS": "business", "MEDIA_CREATOR": "creator", "CREATOR": "creator"}


class InstagramOAuth:
    platform = Platform.INSTAGRAM
    uses_pkce = False
    refresh_ahead = timedelta(days=10)  # long-lived tokens last 60 days and can be extended

    def __init__(self, api: NetworkApi, app_id: str, app_secret: str, version: str) -> None:
        self._api = api
        self._app_id = app_id
        self._app_secret = app_secret
        self._version = version

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str:
        query = {
            "client_id": self._app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": ",".join(SCOPES),
            "state": state,
        }
        return f"{AUTHORIZE_URL}?{urlencode(query)}"

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        short = await self._api.call(
            "POST",
            TOKEN_URL,
            data={
                "client_id": self._app_id,
                "client_secret": self._app_secret,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": code.removesuffix("#_"),
            },
            idempotent=False,
        )
        entry = short.body["data"][0] if isinstance(short.body.get("data"), list) else short.body
        long = await self._api.call(
            "GET",
            f"{GRAPH}/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": self._app_secret,
                "access_token": entry["access_token"],
            },
        )
        token = str(long.body["access_token"])
        me = await self._api.call(
            "GET",
            f"{GRAPH}/{self._version}/me",
            params={"fields": "user_id,username,name,profile_picture_url,account_type", "access_token": token},
        )
        permissions = entry.get("permissions") or ",".join(SCOPES)
        if isinstance(permissions, list):
            permissions = ",".join(permissions)
        username = me.body.get("username")
        return [
            OAuthCredential(
                platform=Platform.INSTAGRAM,
                account_id=str(me.body.get("user_id") or entry["user_id"]),
                account=ConnectedAccount(
                    Platform.INSTAGRAM,
                    display_name=me.body.get("name") or username or "Instagram",
                    username=username,
                    avatar_url=me.body.get("profile_picture_url"),
                    profile_url=f"https://www.instagram.com/{username}/" if username else None,
                    account_type=_ACCOUNT_TYPES.get(str(me.body.get("account_type", "")).upper()),
                ),
                access_token=token,
                expires_at=datetime.now(UTC) + timedelta(seconds=int(long.body.get("expires_in", 5_184_000))),
                scopes=tuple(str(permissions).split(",")),
                subject=str(entry.get("user_id") or me.body.get("user_id")),
            )
        ]

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        from dataclasses import replace

        fresh = await self._api.call(
            "GET",
            f"{GRAPH}/refresh_access_token",
            params={"grant_type": "ig_refresh_token", "access_token": credential.access_token},
        )
        return replace(
            credential,
            access_token=str(fresh.body["access_token"]),
            expires_at=datetime.now(UTC) + timedelta(seconds=int(fresh.body.get("expires_in", 5_184_000))),
        )


class InstagramConnector:
    """Container → wait until FINISHED → media_publish. Carousels: children first, then the parent."""

    can_delete = False  # Instagram's API doesn't delete published media

    def __init__(self, api: NetworkApi, version: str) -> None:
        self._api = api
        self._base = f"{GRAPH}/{version}"

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult:
        options = target.options if isinstance(target.options, InstagramOptions) else InstagramOptions()
        if not media:
            raise ProviderRejected("Instagram needs a photo or video.")
        if target.content_type is ContentType.CAROUSEL or len(media) > 1:
            children = [await self._container(credential, self._media_params(m, carousel_item=True)) for m in media]
            handle = {
                "step": "children",
                "children": children,
                "caption": caption,
                "collaborators": list(options.collaborators),
            }
            return ConnectorResult.processing(json.dumps(handle), _wait_for(media))

        params = self._media_params(media[0], carousel_item=False)
        if target.content_type is ContentType.STORY:
            params["media_type"] = "STORIES"
        else:
            params["caption"] = caption
            if media[0].kind is MediaKind.VIDEO:
                params["media_type"] = "REELS"
                params["share_to_feed"] = "true" if options.share_reels_to_feed else "false"
                if options.cover_image_url:
                    params["cover_url"] = options.cover_image_url
                elif options.thumbnail_offset_ms is not None:
                    params["thumb_offset"] = str(options.thumbnail_offset_ms)
            if options.collaborators:
                params["collaborators"] = json.dumps(list(options.collaborators))
        container = await self._container(credential, params)
        return ConnectorResult.processing(json.dumps({"step": "publish", "container": container}), _wait_for(media))

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult:
        state: dict[str, Any] = json.loads(handle)
        if state["step"] == "children":
            statuses = [await self._status(credential, c) for c in state["children"]]
            if failed := [s for s in statuses if s in ("ERROR", "EXPIRED")]:
                return ConnectorResult.failed(f"Instagram couldn't process a carousel item ({failed[0]}).")
            if any(s != "FINISHED" for s in statuses):
                return ConnectorResult.processing(handle)
            params = {"media_type": "CAROUSEL", "children": ",".join(state["children"]), "caption": state["caption"]}
            if state.get("collaborators"):
                params["collaborators"] = json.dumps(state["collaborators"])
            parent = await self._container(credential, params)
            return ConnectorResult.processing(
                json.dumps({"step": "publish", "container": parent}), timedelta(seconds=5)
            )

        status = await self._status(credential, state["container"])
        if status in ("ERROR", "EXPIRED"):
            return ConnectorResult.failed(f"Instagram couldn't process the file ({status}).")
        if status == "PUBLISHED":
            return ConnectorResult.published(state["container"])
        if status != "FINISHED":
            return ConnectorResult.processing(handle)
        published = await self._api.call(
            "POST",
            f"{self._base}/{credential.account_id}/media_publish",
            data={"creation_id": state["container"], "access_token": credential.access_token},
            idempotent=False,
        )
        media_id = str(published.body["id"])
        link = await self._api.call(
            "GET", f"{self._base}/{media_id}", params={"fields": "permalink", "access_token": credential.access_token}
        )
        return ConnectorResult.published(media_id, link.body.get("permalink"))

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None:
        raise ProviderRejected("Instagram doesn't allow deleting published posts through its API.")

    @staticmethod
    def _media_params(asset: MediaAsset, *, carousel_item: bool) -> dict[str, str]:
        params: dict[str, str] = {}
        if asset.kind is MediaKind.VIDEO:
            params["video_url"] = asset.url.value
            params["media_type"] = "VIDEO" if carousel_item else "REELS"
        else:
            params["image_url"] = asset.url.value
        if carousel_item:
            params["is_carousel_item"] = "true"
        return params

    async def _container(self, credential: OAuthCredential, params: dict[str, str]) -> str:
        created = await self._api.call(
            "POST",
            f"{self._base}/{credential.account_id}/media",
            data={**params, "access_token": credential.access_token},
            idempotent=False,
        )
        return str(created.body["id"])

    async def _status(self, credential: OAuthCredential, container: str) -> str:
        found = await self._api.call(
            "GET",
            f"{self._base}/{container}",
            params={"fields": "status_code", "access_token": credential.access_token},
        )
        return str(found.body.get("status_code", "IN_PROGRESS"))


def _wait_for(media: Sequence[MediaAsset]) -> timedelta:
    return timedelta(seconds=20) if any(m.kind is MediaKind.VIDEO for m in media) else timedelta(seconds=3)
