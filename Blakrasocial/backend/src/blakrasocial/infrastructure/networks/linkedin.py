"""LinkedIn: Sign In with LinkedIn (OpenID) + Share on LinkedIn (`w_member_social`), Posts/Images/Videos APIs."""

from __future__ import annotations

import json
import re
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote, urlencode

import httpx

from blakrasocial.application.errors import ApplicationError, ProviderAuthError, ProviderRejected
from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.domain.entities import (
    ConnectedAccount,
    LinkedInOptions,
    MediaAsset,
    OAuthCredential,
    PostTarget,
)
from blakrasocial.domain.enums import LinkedInVisibility, MediaKind, Platform
from blakrasocial.infrastructure.networks.http import MediaSource, NetworkApi, default_error

AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"  # noqa: S105
API = "https://api.linkedin.com"
SCOPES = ("openid", "profile", "w_member_social")

_VISIBILITY = {
    LinkedInVisibility.PUBLIC: "PUBLIC",
    LinkedInVisibility.CONNECTIONS: "CONNECTIONS",
    LinkedInVisibility.LOGGED_IN: "LOGGED_IN",
}
# LinkedIn's "little text" format: these must be escaped or the post is cut off. '#' stays so hashtags work.
_RESERVED = re.compile(r"([\\|{}@\[\]()<>*_~])")


def escape_commentary(text: str) -> str:
    return _RESERVED.sub(r"\\\1", text)


def translate(status: int, body: Any, headers: httpx.Headers) -> ApplicationError | None:
    if status < 400:
        return None
    message = body.get("message") if isinstance(body, dict) else None
    if isinstance(body, dict) and body.get("error_description"):
        message = body["error_description"]
    return default_error("LinkedIn", status, message, headers)


class LinkedInOAuth:
    platform = Platform.LINKEDIN
    uses_pkce = False  # LinkedIn's web flow authenticates with the client secret instead
    refresh_ahead = None  # self-serve apps get no refresh token: members reconnect every 60 days

    def __init__(self, api: NetworkApi, client_id: str, client_secret: str) -> None:
        self._api = api
        self._client_id = client_id
        self._client_secret = client_secret

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str:
        query = {
            "response_type": "code",
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": " ".join(SCOPES),
        }
        return f"{AUTHORIZE_URL}?{urlencode(query)}"

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        token = await self._api.call(
            "POST",
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": self._client_id,
                "client_secret": self._client_secret,
            },
            idempotent=False,
        )
        access_token = str(token.body["access_token"])
        me = await self._api.call("GET", f"{API}/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        sub = me.body.get("sub")
        if not sub:
            raise ProviderRejected("LinkedIn didn't return the member id.")
        now = datetime.now(UTC)
        return [
            OAuthCredential(
                platform=Platform.LINKEDIN,
                account_id=f"urn:li:person:{sub}",
                account=ConnectedAccount(
                    Platform.LINKEDIN,
                    display_name=me.body.get("name") or "LinkedIn member",
                    avatar_url=me.body.get("picture"),
                    account_type="personal",
                ),
                access_token=access_token,
                refresh_token=token.body.get("refresh_token"),
                expires_at=now + timedelta(seconds=int(token.body.get("expires_in", 5_184_000))),
                scopes=tuple(str(token.body.get("scope", " ".join(SCOPES))).replace(",", " ").split()),
            )
        ]

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        raise ProviderAuthError("LinkedIn access expired. Connect LinkedIn again.")


class LinkedInConnector:
    can_delete = True

    def __init__(self, api: NetworkApi, media: MediaSource, version: str) -> None:
        self._api = api
        self._media = media
        self._version = version

    def _headers(self, credential: OAuthCredential) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {credential.access_token}",
            "LinkedIn-Version": self._version,
            "X-Restli-Protocol-Version": "2.0.0",
        }

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult:
        options = target.options if isinstance(target.options, LinkedInOptions) else LinkedInOptions()
        body: dict[str, Any] = {
            "author": credential.account_id,
            "commentary": escape_commentary(caption),
            "visibility": _VISIBILITY[options.visibility],
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": options.disable_share,
        }
        videos = [m for m in media if m.kind is MediaKind.VIDEO]
        images = [m for m in media if m.kind is MediaKind.IMAGE]
        if videos:
            video_urn = await self._upload_video(credential, videos[0])
            body["content"] = {"media": {"id": video_urn, "title": options.document_title or ""}}
            # LinkedIn processes video asynchronously; the post is created once it's AVAILABLE.
            return ConnectorResult.processing(json.dumps({"video": video_urn, "post": body}), timedelta(seconds=15))
        if len(images) == 1:
            body["content"] = {"media": {"id": await self._upload_image(credential, images[0])}}
        elif images:
            urns = [await self._upload_image(credential, image) for image in images]
            body["content"] = {"multiImage": {"images": [{"id": urn, "altText": ""} for urn in urns]}}
        return await self._create_post(credential, body)

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult:
        pending = json.loads(handle)
        video = await self._api.call(
            "GET", f"{API}/rest/videos/{quote(pending['video'], safe='')}", headers=self._headers(credential)
        )
        status = str(video.body.get("status", "")).upper()
        if status == "AVAILABLE":
            return await self._create_post(credential, pending["post"])
        if status == "PROCESSING_FAILED":
            reason = video.body.get("processingFailureReason") or "LinkedIn couldn't process the video."
            return ConnectorResult.failed(str(reason))
        return ConnectorResult.processing(handle, timedelta(seconds=20))

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None:
        await self._api.call(
            "DELETE", f"{API}/rest/posts/{quote(remote_id, safe='')}", headers=self._headers(credential)
        )

    async def _create_post(self, credential: OAuthCredential, body: dict[str, Any]) -> ConnectorResult:
        created = await self._api.call(
            "POST", f"{API}/rest/posts", headers=self._headers(credential), json=body, idempotent=False
        )
        urn = created.headers.get("x-restli-id") or created.headers.get("x-linkedin-id")
        if not urn:
            raise ProviderRejected("LinkedIn accepted the post but didn't return its id.")
        return ConnectorResult.published(urn, f"https://www.linkedin.com/feed/update/{urn}/")

    async def _upload_image(self, credential: OAuthCredential, image: MediaAsset) -> str:
        init = await self._api.call(
            "POST",
            f"{API}/rest/images?action=initializeUpload",
            headers=self._headers(credential),
            json={"initializeUploadRequest": {"owner": credential.account_id}},
            idempotent=False,
        )
        value = init.body["value"]
        data = await self._media.read_all(image.url.value, max_bytes=36_152_320)
        await self._api.call(
            "PUT",
            value["uploadUrl"],
            headers={"Authorization": f"Bearer {credential.access_token}", "Content-Type": image.mime_type},
            content=data,
        )
        return str(value["image"])

    async def _upload_video(self, credential: OAuthCredential, video: MediaAsset) -> str:
        init = await self._api.call(
            "POST",
            f"{API}/rest/videos?action=initializeUpload",
            headers=self._headers(credential),
            json={
                "initializeUploadRequest": {
                    "owner": credential.account_id,
                    "fileSizeBytes": video.size_bytes,
                    "uploadCaptions": False,
                    "uploadThumbnail": False,
                }
            },
            idempotent=False,
        )
        value = init.body["value"]
        instructions = sorted(value["uploadInstructions"], key=lambda i: int(i["firstByte"]))
        part_size = int(instructions[0]["lastByte"]) - int(instructions[0]["firstByte"]) + 1
        etags: list[str] = []
        index = 0
        async for chunk in self._media.chunks(video.url.value, part_size):
            if index >= len(instructions):
                raise ProviderRejected("The video is larger than LinkedIn expected.")
            uploaded = await self._api.call(
                "PUT",
                instructions[index]["uploadUrl"],
                headers={"Content-Type": "application/octet-stream"},
                content=chunk,
            )
            etag = uploaded.headers.get("etag")
            if not etag:
                raise ProviderRejected("LinkedIn didn't confirm a video part.")
            etags.append(etag)
            index += 1
        await self._api.call(
            "POST",
            f"{API}/rest/videos?action=finalizeUpload",
            headers=self._headers(credential),
            json={
                "finalizeUploadRequest": {
                    "video": value["video"],
                    "uploadToken": value.get("uploadToken", ""),
                    "uploadedPartIds": etags,
                }
            },
            idempotent=False,
        )
        return str(value["video"])
