from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import timedelta
from enum import StrEnum
from typing import Protocol

from blakrasocial.domain.entities import MediaAsset, OAuthCredential, PostTarget, TikTokCreatorInfo


class ConnectorState(StrEnum):
    PUBLISHED = "published"
    PROCESSING = "processing"  # the network accepted it and is still processing (poll later)
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class ConnectorResult:
    state: ConnectorState
    remote_id: str | None = None
    url: str | None = None
    error: str | None = None
    poll_handle: str | None = None  # opaque, connector-defined; given back to `poll`
    poll_after: timedelta | None = None

    @classmethod
    def published(cls, remote_id: str, url: str | None = None) -> ConnectorResult:
        return cls(ConnectorState.PUBLISHED, remote_id=remote_id, url=url)

    @classmethod
    def processing(cls, handle: str, after: timedelta = timedelta(seconds=20)) -> ConnectorResult:
        return cls(ConnectorState.PROCESSING, poll_handle=handle, poll_after=after)

    @classmethod
    def failed(cls, error: str) -> ConnectorResult:
        return cls(ConnectorState.FAILED, error=error)


class PlatformConnector(Protocol):
    """Publishes to one network with the customer's own credential (Strategy per network).

    Raise `ProviderUnavailable`/`ProviderRateLimited` for transient failures (the job is retried),
    `ProviderAuthError` when the customer must reconnect, `ProviderRejected` for a permanent refusal.
    """

    @property
    def can_delete(self) -> bool: ...

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult: ...

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult: ...

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None: ...


class CreatorInfoReader(Protocol):
    """TikTok: the creator's current posting options, read before every post (required by TikTok)."""

    async def creator_info(self, credential: OAuthCredential) -> TikTokCreatorInfo: ...
