from __future__ import annotations

from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.application.ports import SocialPublisher
from blakrasocial.domain.entities import PostStatus
from blakrasocial.domain.value_objects import PostId, ProfileKey


class ListPosts:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]:
        bounded = ListPostsQuery(
            limit=max(1, min(query.limit, 100)),
            platform=query.platform,
            last_days=max(1, min(query.last_days, 365)),
        )
        return await self._publisher.list_posts(profile, bounded)


class GetPostStatus:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, profile: ProfileKey, post_id: PostId) -> PostStatus:
        return await self._publisher.get_post_status(profile, post_id)


class DeletePost:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, profile: ProfileKey, post_id: PostId) -> None:
        await self._publisher.delete_post(profile, post_id)
