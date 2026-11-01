"""Facebook Pages via Facebook Login: feed posts, photos, videos, Reels and Stories."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

from blakrasocial.application.errors import ProviderRejected
from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.domain.entities import (
    ConnectedAccount,
    FacebookOptions,
    MediaAsset,
    OAuthCredential,
    PostTarget,
)
from blakrasocial.domain.enums import ContentType, MediaKind, Platform
from blakrasocial.infrastructure.networks.http import NetworkApi

GRAPH = "https://graph.facebook.com"
RUPLOAD = "https://rupload.facebook.com/video-upload"
SCOPES = ("pages_show_list", "pages_read_engagement", "pages_manage_posts")


class FacebookOAuth:
    """Login yields a user token; we keep only Page tokens (they don't expire while the user keeps access)."""

    platform = Platform.FACEBOOK
    uses_pkce = False
    refresh_ahead = None

    def __init__(self, api: NetworkApi, app_id: str, app_secret: str, version: str) -> None:
        self._api = api
        self._app_id = app_id
        self._app_secret = app_secret
        self._base = f"{GRAPH}/{version}"
        self._dialog = f"https://www.facebook.com/{version}/dialog/oauth"

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str:
        query = {
            "client_id": self._app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",
            "scope": ",".join(SCOPES),
        }
        return f"{self._dialog}?{urlencode(query)}"

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        short = await self._api.call(
            "GET",
            f"{self._base}/oauth/access_token",
            params={
                "client_id": self._app_id,
                "client_secret": self._app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        long = await self._api.call(
            "GET",
            f"{self._base}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": self._app_id,
                "client_secret": self._app_secret,
                "fb_exchange_token": short.body["access_token"],
            },
        )
        pages = await self._api.call(
            "GET",
            f"{self._base}/me/accounts",
            params={
                "fields": "id,name,access_token,link,picture{url},tasks",
                "limit": "100",
                "access_token": long.body["access_token"],
            },
        )
        credentials: list[OAuthCredential] = []
        for page in pages.body.get("data", []):
            tasks = page.get("tasks")
            if tasks is not None and "CREATE_CONTENT" not in tasks:
                continue  # the user can't post on this Page
            credentials.append(
                OAuthCredential(
                    platform=Platform.FACEBOOK,
                    account_id=str(page["id"]),
                    account=ConnectedAccount(
                        Platform.FACEBOOK,
                        display_name=page.get("name") or "Facebook Page",
                        avatar_url=(page.get("picture") or {}).get("data", {}).get("url"),
                        profile_url=page.get("link") or f"https://www.facebook.com/{page['id']}",
                        account_type="page",
                    ),
                    access_token=str(page["access_token"]),
                    scopes=SCOPES,
                )
            )
        return credentials

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        return credential  # Page tokens from a long-lived user token don't expire


class FacebookConnector:
    can_delete = True

    def __init__(self, api: NetworkApi, version: str) -> None:
        self._api = api
        self._version = version
        self._base = f"{GRAPH}/{version}"

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult:
        options = target.options if isinstance(target.options, FacebookOptions) else FacebookOptions()
        page, token = credential.account_id, credential.access_token
        videos = [m for m in media if m.kind is MediaKind.VIDEO]
        images = [m for m in media if m.kind is MediaKind.IMAGE]

        if target.content_type is ContentType.REEL:
            if not videos:
                raise ProviderRejected("A Facebook Reel needs a video.")
            video_id = await self._upload_hosted(page, token, "video_reels", videos[0])
            params: dict[str, str] = {
                "upload_phase": "finish",
                "video_id": video_id,
                "video_state": "PUBLISHED",
                "description": caption,
            }
            if options.title:
                params["title"] = options.title
            await self._post(f"{page}/video_reels", token, params)
            return ConnectorResult.processing(json.dumps({"video": video_id, "kind": "reel"}), timedelta(seconds=20))

        if target.content_type is ContentType.STORY:
            if videos:
                video_id = await self._upload_hosted(page, token, "video_stories", videos[0])
                done = await self._post(
                    f"{page}/video_stories", token, {"upload_phase": "finish", "video_id": video_id}
                )
                return self._published(done.get("post_id") or video_id)
            if not images:
                raise ProviderRejected("A Facebook Story needs a photo or video.")
            photo = await self._post(f"{page}/photos", token, {"url": images[0].url.value, "published": "false"})
            done = await self._post(f"{page}/photo_stories", token, {"photo_id": str(photo["id"])})
            return self._published(done.get("post_id") or photo["id"])

        if videos:
            params = {"file_url": videos[0].url.value, "description": caption}
            if options.title:
                params["title"] = options.title
            created = await self._post(f"{page}/videos", token, params)
            return ConnectorResult.processing(
                json.dumps({"video": str(created["id"]), "kind": "video"}), timedelta(seconds=20)
            )
        if len(images) == 1:
            created = await self._post(f"{page}/photos", token, {"url": images[0].url.value, "message": caption})
            return self._published(created.get("post_id") or created["id"])
        if images:
            ids = [
                str((await self._post(f"{page}/photos", token, {"url": m.url.value, "published": "false"}))["id"])
                for m in images
            ]
            created = await self._post(
                f"{page}/feed",
                token,
                {"message": caption, "attached_media": json.dumps([{"media_fbid": i} for i in ids])},
            )
            return self._published(created["id"])
        created = await self._post(f"{page}/feed", token, {"message": caption})
        return self._published(created["id"])

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult:
        state = json.loads(handle)
        found = await self._api.call(
            "GET",
            f"{self._base}/{state['video']}",
            params={"fields": "status,permalink_url", "access_token": credential.access_token},
        )
        status = found.body.get("status") or {}
        video_status = status.get("video_status")
        if video_status in ("error", "upload_failed", "expired"):
            phase = status.get("processing_phase") or {}
            return ConnectorResult.failed(
                str((phase.get("error") or {}).get("message") or "Facebook couldn't process the video.")
            )
        publishing = (status.get("publishing_phase") or {}).get("status")
        if video_status == "ready" and publishing in (None, "complete"):
            permalink = found.body.get("permalink_url")
            url = f"https://www.facebook.com{permalink}" if permalink and permalink.startswith("/") else permalink
            return ConnectorResult.published(state["video"], url)
        return ConnectorResult.processing(handle)

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None:
        await self._api.call("DELETE", f"{self._base}/{remote_id}", params={"access_token": credential.access_token})

    async def _upload_hosted(self, page: str, token: str, edge: str, video: MediaAsset) -> str:
        """Reels/Stories: start a session, let Facebook fetch the file from our storage, return the video id."""
        started = await self._post(f"{page}/{edge}", token, {"upload_phase": "start"})
        video_id = str(started["video_id"])
        await self._api.call(
            "POST",
            f"{RUPLOAD}/{self._version}/{video_id}",
            headers={"Authorization": f"OAuth {token}", "file_url": video.url.value},
            idempotent=True,
        )
        return video_id

    async def _post(self, path: str, token: str, data: dict[str, str]) -> dict[str, Any]:
        response = await self._api.call(
            "POST", f"{self._base}/{path}", data={**data, "access_token": token}, idempotent=False
        )
        body: dict[str, Any] = response.body
        return body

    @staticmethod
    def _published(post_id: object) -> ConnectorResult:
        return ConnectorResult.published(str(post_id), f"https://www.facebook.com/{post_id}")
