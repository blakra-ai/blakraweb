"""Persistence ports for direct mode. Rows are addressed by `ProfileId` (a hash of the profile key),
so a leaked database never reveals the keys customers authenticate with."""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import StrEnum
from typing import NewType, Protocol

from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.domain.entities import MediaAsset, OAuthCredential, PlatformOptions
from blakrasocial.domain.enums import ContentType, Platform
from blakrasocial.domain.value_objects import PostId, ProfileKey

ProfileId = NewType("ProfileId", str)


def profile_id_of(key: ProfileKey) -> ProfileId:
    return ProfileId(hashlib.sha256(key.value.encode()).hexdigest())


class TargetState(StrEnum):
    QUEUED = "queued"  # waiting for its due time (scheduled) or for the worker (publish now)
    PROCESSING = "processing"  # accepted by the network, waiting for it to finish
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"  # a scheduled target removed before it ran
    DELETED = "deleted"  # removed from the network after publishing


@dataclass(frozen=True, slots=True)
class StoredTarget:
    platform: Platform
    content_type: ContentType
    options: PlatformOptions
    state: TargetState
    due_at: datetime
    id: int | None = None
    attempts: int = 0
    remote_id: str | None = None
    url: str | None = None
    error: str | None = None
    poll_handle: str | None = None


@dataclass(frozen=True, slots=True)
class StoredPost:
    id: PostId
    caption: str
    media: tuple[MediaAsset, ...]
    targets: tuple[StoredTarget, ...]
    created_at: datetime
    idempotency_key: str
    schedule_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class ClaimedTarget:
    """A target leased to one worker; nobody else picks it up until the lease runs out."""

    profile_id: ProfileId
    post: StoredPost
    target: StoredTarget


@dataclass(frozen=True, slots=True)
class TargetUpdate:
    state: TargetState
    remote_id: str | None = None
    url: str | None = None
    error: str | None = None
    poll_handle: str | None = None
    next_run_at: datetime | None = None  # for QUEUED (retry) and PROCESSING (next poll)


@dataclass(frozen=True, slots=True)
class PendingAuthorization:
    """Server-side half of an OAuth round trip, keyed by a hash of the one-time `state`."""

    profile_id: ProfileId
    platform: Platform
    expires_at: datetime
    code_verifier: str | None = field(default=None, repr=False)
    redirect_url: str | None = None
    candidates: tuple[OAuthCredential, ...] = ()  # accounts to choose from (Facebook Pages)


class ProfileRepository(Protocol):
    async def create(self, profile_id: ProfileId, title: str) -> None: ...

    async def exists(self, profile_id: ProfileId) -> bool: ...

    async def delete(self, profile_id: ProfileId) -> None:
        """Removes the profile with its credentials, posts and pending authorizations."""
        ...


class CredentialRepository(Protocol):
    async def get(self, profile_id: ProfileId, platform: Platform) -> OAuthCredential | None: ...

    async def for_profile(self, profile_id: ProfileId) -> list[OAuthCredential]: ...

    async def save(self, profile_id: ProfileId, credential: OAuthCredential) -> None: ...

    async def delete(self, profile_id: ProfileId, platform: Platform) -> bool: ...

    async def mark_needs_reconnect(self, profile_id: ProfileId, platform: Platform) -> None: ...

    async def expiring(self, before: datetime, limit: int) -> list[tuple[ProfileId, OAuthCredential]]: ...

    async def delete_by_subject(self, platform: Platform, subject: str) -> int:
        """Removes every credential the given network user approved (across all profiles)."""
        ...


class AuthorizationStateRepository(Protocol):
    async def put(self, state_hash: str, pending: PendingAuthorization) -> None: ...

    async def take(self, state_hash: str, now: datetime) -> PendingAuthorization | None:
        """Atomically returns and deletes an unexpired entry (each `state` works once)."""
        ...


class PostRepository(Protocol):
    async def add(self, profile_id: ProfileId, post: StoredPost) -> StoredPost:
        """Stores the post, or returns the existing one with the same idempotency key."""
        ...

    async def get(self, profile_id: ProfileId, post_id: PostId) -> StoredPost | None: ...

    async def list(self, profile_id: ProfileId, query: ListPostsQuery, since: datetime) -> Page[StoredPost]: ...

    async def claim_due(self, now: datetime, limit: int, lease: timedelta) -> Sequence[ClaimedTarget]: ...

    async def update_target(self, target_id: int, update: TargetUpdate) -> None: ...


@dataclass(frozen=True, slots=True)
class DeletionReceipt:
    code: str
    platform: Platform
    removed: int
    requested_at: datetime


class DeletionReceiptRepository(Protocol):
    async def add(self, receipt: DeletionReceipt) -> None: ...

    async def get(self, code: str) -> DeletionReceipt | None: ...
