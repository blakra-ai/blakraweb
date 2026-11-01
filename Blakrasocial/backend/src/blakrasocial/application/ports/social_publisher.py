from __future__ import annotations

from typing import Protocol, runtime_checkable

from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.domain.entities import (
    ConnectedAccount,
    ConnectUrl,
    MediaUploadTicket,
    Post,
    PostStatus,
)
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import IdempotencyKey, PostId, ProfileKey


@runtime_checkable
class SocialPublisher(Protocol):
    """The one abstraction over a unified social media provider (Ayrshare today).

    Implementations translate provider failures into `ProviderError` subclasses so that
    nothing above the infrastructure layer ever sees provider-specific codes.
    """

    async def create_profile(self, title: str) -> ProfileKey: ...

    async def get_connect_url(
        self, profile: ProfileKey, redirect_url: str | None, origin: str | None
    ) -> ConnectUrl: ...

    async def get_connected_accounts(self, profile: ProfileKey) -> list[ConnectedAccount]: ...

    async def unlink_account(self, profile: ProfileKey, platform: Platform) -> None: ...

    async def upload_media(self, profile: ProfileKey, file_name: str, content_type: str) -> MediaUploadTicket: ...

    async def publish(self, profile: ProfileKey, post: Post, idempotency_key: IdempotencyKey) -> PostStatus: ...

    async def delete_post(self, profile: ProfileKey, post_id: PostId) -> None: ...

    async def get_post_status(self, profile: ProfileKey, post_id: PostId) -> PostStatus: ...

    async def list_posts(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]: ...
