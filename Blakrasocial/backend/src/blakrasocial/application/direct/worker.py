from __future__ import annotations

import asyncio
from datetime import timedelta

from blakrasocial.application.direct.registry import NetworkRegistry
from blakrasocial.application.errors import (
    ApplicationError,
    NotConfigured,
    ProviderAuthError,
    ProviderRateLimited,
    ProviderUnavailable,
)
from blakrasocial.application.ports import Clock
from blakrasocial.application.ports.platform_connector import ConnectorResult, ConnectorState
from blakrasocial.application.ports.repositories import (
    ClaimedTarget,
    CredentialRepository,
    PostRepository,
    TargetState,
    TargetUpdate,
)
from blakrasocial.domain.entities import PostTarget
from blakrasocial.domain.enums import Platform

MAX_PUBLISH_ATTEMPTS = 5
MAX_POLLS = 90  # ~30 minutes at the default 20 s interval
LEASE = timedelta(minutes=10)
_CONCURRENCY = 4


def _backoff(attempt: int) -> timedelta:
    return timedelta(seconds=min(30 * 2 ** max(attempt - 1, 0), 30 * 60))


class PublishWorker:
    """Publishes due targets and follows up on ones the network is still processing.

    Failure policy: transient errors are retried with exponential backoff (5 attempts); an expired
    or revoked credential fails the target and flags the account for reconnecting; anything the
    network refuses fails the target with the network's message.
    """

    def __init__(
        self,
        posts: PostRepository,
        credentials: CredentialRepository,
        registry: NetworkRegistry,
        clock: Clock,
        *,
        batch_size: int = 20,
        logger: object | None = None,
    ) -> None:
        self._posts = posts
        self._credentials = credentials
        self._registry = registry
        self._clock = clock
        self._batch_size = batch_size
        self._log = logger

    async def run_once(self) -> int:
        claimed = await self._posts.claim_due(self._clock.now(), self._batch_size, LEASE)
        gate = asyncio.Semaphore(_CONCURRENCY)

        async def guarded(item: ClaimedTarget) -> None:
            async with gate:
                await self._process(item)

        await asyncio.gather(*(guarded(c) for c in claimed))
        return len(claimed)

    async def _process(self, item: ClaimedTarget) -> None:
        target = item.target
        assert target.id is not None
        polling = target.state is TargetState.PROCESSING
        try:
            connector = self._registry.get(target.platform).connector
            credential = await self._credentials.get(item.profile_id, target.platform)
            if credential is None or not credential.is_usable(self._clock.now()):
                await self._fail(target.id, _reconnect_message(target.platform), polling)
                return
            if polling:
                assert target.poll_handle is not None
                result = await connector.poll(credential, target.poll_handle)
            else:
                result = await connector.publish(
                    credential,
                    item.post.caption,
                    PostTarget(target.platform, target.content_type, target.options),
                    item.post.media,
                )
        except ProviderAuthError:
            await self._credentials.mark_needs_reconnect(item.profile_id, target.platform)
            await self._fail(target.id, _reconnect_message(target.platform), polling)
            return
        except (ProviderUnavailable, ProviderRateLimited) as exc:
            await self._retry(item, exc)
            return
        except NotConfigured as exc:
            await self._fail(target.id, exc.message, polling)
            return
        except ApplicationError as exc:
            await self._fail(target.id, exc.message, polling)
            return
        except Exception as exc:  # unknown failure: retry a few times, then give up
            self._warn("publish_unexpected_error", platform=target.platform.value, error=repr(exc))
            await self._retry(item, exc)
            return
        await self._record(item, result)

    async def _record(self, item: ClaimedTarget, result: ConnectorResult) -> None:
        target = item.target
        assert target.id is not None
        now = self._clock.now()
        if result.state is ConnectorState.PUBLISHED:
            update = TargetUpdate(TargetState.PUBLISHED, remote_id=result.remote_id, url=result.url)
        elif result.state is ConnectorState.FAILED:
            update = TargetUpdate(TargetState.FAILED, error=result.error or "The network refused the post.")
        elif target.state is TargetState.PROCESSING and target.attempts >= MAX_POLLS:
            update = TargetUpdate(TargetState.FAILED, error="The network took too long to process the file.")
        else:
            update = TargetUpdate(
                TargetState.PROCESSING,
                remote_id=result.remote_id,
                poll_handle=result.poll_handle,
                next_run_at=now + (result.poll_after or timedelta(seconds=20)),
            )
        await self._posts.update_target(target.id, update)

    async def _retry(self, item: ClaimedTarget, exc: BaseException) -> None:
        target = item.target
        assert target.id is not None
        limit = MAX_POLLS if target.state is TargetState.PROCESSING else MAX_PUBLISH_ATTEMPTS
        message = exc.message if isinstance(exc, ApplicationError) else "The network is unavailable."
        if target.attempts >= limit:
            await self._posts.update_target(target.id, TargetUpdate(TargetState.FAILED, error=message))
            return
        delay = _backoff(target.attempts)
        if isinstance(exc, ProviderRateLimited) and exc.retry_after_seconds:
            delay = max(delay, timedelta(seconds=exc.retry_after_seconds))
        await self._posts.update_target(
            target.id,
            TargetUpdate(
                target.state,
                remote_id=target.remote_id,
                poll_handle=target.poll_handle,
                error=message,
                next_run_at=self._clock.now() + delay,
            ),
        )

    async def _fail(self, target_id: int, message: str, polling: bool) -> None:
        del polling
        await self._posts.update_target(target_id, TargetUpdate(TargetState.FAILED, error=message))

    def _warn(self, event: str, **fields: object) -> None:
        warning = getattr(self._log, "warning", None)
        if warning is not None:
            warning(event, **fields)


class TokenRefresher:
    """Renews credentials shortly before they expire; flags the account when the network says no."""

    def __init__(self, credentials: CredentialRepository, registry: NetworkRegistry, clock: Clock) -> None:
        self._credentials = credentials
        self._registry = registry
        self._clock = clock

    async def run_once(self) -> int:
        now = self._clock.now()
        renewed = 0
        refreshable = {
            p: self._registry.get(p).provider.refresh_ahead
            for p in self._registry.platforms
            if self._registry.get(p).provider.refresh_ahead is not None
        }
        if not refreshable:
            return 0
        horizon = now + max(a for a in refreshable.values() if a is not None)
        for profile_id, credential in await self._credentials.expiring(horizon, 100):
            ahead = refreshable.get(credential.platform)
            if ahead is None or credential.expires_at is None or credential.expires_at - now > ahead:
                continue
            provider = self._registry.get(credential.platform).provider
            try:
                fresh = await provider.refresh(credential)
            except ProviderAuthError:
                await self._credentials.mark_needs_reconnect(profile_id, credential.platform)
                continue
            except (ProviderUnavailable, ProviderRateLimited):
                continue  # try again on the next run
            await self._credentials.save(profile_id, fresh)
            renewed += 1
        return renewed


def _reconnect_message(platform: Platform) -> str:
    return f"{platform.value.title()} needs to be reconnected. Open Connections and connect it again."
