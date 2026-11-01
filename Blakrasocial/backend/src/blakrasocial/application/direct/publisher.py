from __future__ import annotations

import re
import secrets
import uuid
from datetime import timedelta

from blakrasocial.application.direct.linking import AccountLinker
from blakrasocial.application.direct.posts import PostQueue
from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.application.ports.object_storage import ObjectStorage
from blakrasocial.application.ports.repositories import ProfileRepository, profile_id_of
from blakrasocial.domain.entities import ConnectedAccount, ConnectUrl, MediaUploadTicket, Post, PostStatus
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import IdempotencyKey, PostId, ProfileKey

UPLOAD_URL_LIFETIME = timedelta(hours=1)
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def media_prefix(profile_id: str) -> str:
    """Storage folder for one profile's uploads (derived from the hashed id, never the key itself)."""
    return f"u/{profile_id[:24]}/"


class DirectSocialPublisher:
    """`SocialPublisher` built from our own OAuth links, a post queue and S3-compatible storage.

    A thin facade: each concern lives in its own collaborator (SRP), and the use cases above
    can't tell this apart from the Ayrshare adapter (LSP).
    """

    def __init__(
        self,
        profiles: ProfileRepository,
        linker: AccountLinker,
        queue: PostQueue,
        storage: ObjectStorage,
    ) -> None:
        self._profiles = profiles
        self._linker = linker
        self._queue = queue
        self._storage = storage

    async def create_profile(self, title: str) -> ProfileKey:
        key = ProfileKey(f"pk_{secrets.token_urlsafe(32)}")
        await self._profiles.create(profile_id_of(key), title)
        return key

    async def get_connect_url(
        self, profile: ProfileKey, platform: Platform | None, redirect_url: str | None, origin: str | None
    ) -> ConnectUrl:
        del origin
        return await self._linker.start(profile, platform, redirect_url)

    async def get_connected_accounts(self, profile: ProfileKey) -> list[ConnectedAccount]:
        return await self._linker.list(profile)

    async def unlink_account(self, profile: ProfileKey, platform: Platform) -> None:
        await self._linker.unlink(profile, platform)

    async def upload_media(
        self, profile: ProfileKey, file_name: str, content_type: str, size_bytes: int
    ) -> MediaUploadTicket:
        # Folder per profile (hashed, never the key itself) + an unguessable id per file.
        safe = _SAFE_NAME.sub("-", file_name)[-100:] or "file"
        key = f"{media_prefix(profile_id_of(profile))}{uuid.uuid4().hex}/{safe}"
        return await self._storage.presign_upload(key, content_type, size_bytes)

    async def publish(self, profile: ProfileKey, post: Post, idempotency_key: IdempotencyKey) -> PostStatus:
        return await self._queue.enqueue(profile, post, idempotency_key)

    async def delete_post(self, profile: ProfileKey, post_id: PostId) -> None:
        await self._queue.delete(profile, post_id)

    async def get_post_status(self, profile: ProfileKey, post_id: PostId) -> PostStatus:
        return await self._queue.get(profile, post_id)

    async def list_posts(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]:
        return await self._queue.list(profile, query)
