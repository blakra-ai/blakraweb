from __future__ import annotations

import uuid
from collections.abc import Iterable

from blakrasocial.application.direct.registry import NetworkRegistry
from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.application.errors import NotFound, ProviderRejected
from blakrasocial.application.ports import Clock
from blakrasocial.application.ports.repositories import (
    CredentialRepository,
    PostRepository,
    StoredPost,
    StoredTarget,
    TargetState,
    TargetUpdate,
    profile_id_of,
)
from blakrasocial.application.ports.work_signal import WorkSignal
from blakrasocial.domain.entities import PlatformPublishResult, Post, PostStatus
from blakrasocial.domain.enums import PublishState
from blakrasocial.domain.value_objects import IdempotencyKey, PostId, ProfileKey


class PostQueue:
    """Stores posts and their per-network targets; the worker publishes them when they are due.

    "Publish now" goes through the same queue (due immediately), so a crash or a network outage
    never loses a post: the target stays queued and is retried.
    """

    def __init__(
        self,
        posts: PostRepository,
        credentials: CredentialRepository,
        registry: NetworkRegistry,
        clock: Clock,
        signal: WorkSignal,
    ) -> None:
        self._posts = posts
        self._credentials = credentials
        self._registry = registry
        self._clock = clock
        self._signal = signal

    async def enqueue(self, profile: ProfileKey, post: Post, key: IdempotencyKey) -> PostStatus:
        now = self._clock.now()
        due = post.schedule_at or now
        stored = StoredPost(
            id=PostId(f"p_{uuid.uuid4().hex}"),
            caption=post.caption.text,
            media=post.media,
            targets=tuple(
                StoredTarget(t.platform, t.content_type, t.options, TargetState.QUEUED, due) for t in post.targets
            ),
            created_at=now,
            idempotency_key=key.value,
            schedule_at=post.schedule_at,
        )
        saved = await self._posts.add(profile_id_of(profile), stored)
        if saved.schedule_at is None:
            self._signal.notify()
        return to_status(saved)

    async def get(self, profile: ProfileKey, post_id: PostId) -> PostStatus:
        return to_status(await self._get(profile, post_id))

    async def list(self, profile: ProfileKey, query: ListPostsQuery) -> Page[PostStatus]:
        from datetime import timedelta

        since = self._clock.now() - timedelta(days=query.last_days)
        page = await self._posts.list(profile_id_of(profile), query, since)
        return Page(items=tuple(to_status(p) for p in page.items), total=page.total)

    async def delete(self, profile: ProfileKey, post_id: PostId) -> None:
        pid = profile_id_of(profile)
        post = await self._get(profile, post_id)
        changed, undeletable = False, []
        for target in post.targets:
            assert target.id is not None
            if target.state is TargetState.QUEUED:
                await self._posts.update_target(target.id, TargetUpdate(TargetState.CANCELLED))
                changed = True
            elif target.state is TargetState.PUBLISHED and target.remote_id:
                connector = self._registry.get(target.platform).connector
                credential = await self._credentials.get(pid, target.platform)
                if not connector.can_delete or credential is None:
                    undeletable.append(target.platform.value.title())
                    continue
                await connector.delete(credential, target.remote_id)
                await self._posts.update_target(
                    target.id, TargetUpdate(TargetState.DELETED, remote_id=target.remote_id, url=None)
                )
                changed = True
        if not changed and undeletable:
            raise ProviderRejected(
                f"{', '.join(undeletable)} doesn't allow deleting published posts through its API. "
                "Delete it in the app instead."
            )

    async def _get(self, profile: ProfileKey, post_id: PostId) -> StoredPost:
        post = await self._posts.get(profile_id_of(profile), post_id)
        if post is None:
            raise NotFound("Post not found.")
        return post


_TARGET_TO_PUBLIC = {
    TargetState.PROCESSING: PublishState.PENDING,
    TargetState.PUBLISHED: PublishState.PUBLISHED,
    TargetState.FAILED: PublishState.FAILED,
    TargetState.CANCELLED: PublishState.DELETED,
    TargetState.DELETED: PublishState.DELETED,
}


def _public_state(post: StoredPost, target: StoredTarget) -> PublishState:
    if target.state is TargetState.QUEUED:
        return PublishState.SCHEDULED if post.schedule_at is not None and target.attempts == 0 else PublishState.PENDING
    return _TARGET_TO_PUBLIC[target.state]


def overall_state(states: Iterable[PublishState]) -> PublishState:
    found = set(states)
    live = found - {PublishState.DELETED}
    if not live:
        return PublishState.DELETED
    if live == {PublishState.SCHEDULED}:
        return PublishState.SCHEDULED
    if live & {PublishState.PENDING, PublishState.SCHEDULED}:
        return PublishState.PENDING
    if live == {PublishState.FAILED}:
        return PublishState.FAILED
    if PublishState.FAILED in live:
        return PublishState.PARTIAL
    return PublishState.PUBLISHED


def to_status(post: StoredPost) -> PostStatus:
    results = tuple(
        PlatformPublishResult(
            platform=t.platform,
            state=_public_state(post, t),
            provider_post_id=t.remote_id,
            live_url=t.url,
            error=t.error,
        )
        for t in post.targets
    )
    return PostStatus(
        id=post.id,
        state=overall_state(r.state for r in results),
        created_at=post.created_at,
        schedule_at=post.schedule_at,
        caption=post.caption,
        media_urls=tuple(m.url.value for m in post.media),
        results=results,
    )
