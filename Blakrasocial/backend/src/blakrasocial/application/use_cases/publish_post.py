from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections.abc import Sequence
from dataclasses import asdict, replace
from datetime import timedelta
from enum import Enum
from typing import Any

from blakrasocial.application.dto import (
    DirectMessageResult,
    MediaReference,
    PublishOutcome,
    PublishPostCommand,
)
from blakrasocial.application.errors import (
    IdempotencyConflict,
    MediaRejected,
    RequestInProgress,
)
from blakrasocial.application.ports import (
    Clock,
    DirectMessenger,
    IdempotencyStore,
    MediaInspector,
    MediaReferenceSigner,
    SocialPublisher,
)
from blakrasocial.application.ports.idempotency_store import RecordState
from blakrasocial.application.ports.media_signer import VerifiedMedia
from blakrasocial.application.serialization import dump_outcome, load_outcome
from blakrasocial.domain.entities import (
    MediaAsset,
    PlatformPublishResult,
    Post,
    PostStatus,
    WhatsAppOptions,
)
from blakrasocial.domain.enums import Platform, PublishState
from blakrasocial.domain.errors import ValidationFailed
from blakrasocial.domain.validation import (
    IssueCode,
    PlatformRuleRegistry,
    ValidationContext,
    ValidationIssue,
)
from blakrasocial.domain.value_objects import (
    Caption,
    IdempotencyKey,
    MediaUrl,
    PhoneNumber,
    PostId,
    ProfileKey,
)

MIN_SCHEDULE_LEAD = timedelta(minutes=5)
MAX_SCHEDULE_AHEAD = timedelta(days=365)
IDEMPOTENCY_TTL = timedelta(hours=24)
_MESSAGE_CONCURRENCY = 5


class PublishPost:
    """Validate → de-duplicate → publish to networks and send WhatsApp messages.

    Steps run in a fixed order so that nothing reaches a network unless every
    target passed validation, and the same Idempotency-Key never publishes twice.
    """

    def __init__(
        self,
        publisher: SocialPublisher,
        messenger: DirectMessenger,
        rules: PlatformRuleRegistry,
        inspector: MediaInspector,
        signer: MediaReferenceSigner,
        idempotency: IdempotencyStore,
        clock: Clock,
    ) -> None:
        self._publisher = publisher
        self._messenger = messenger
        self._rules = rules
        self._inspector = inspector
        self._signer = signer
        self._idempotency = idempotency
        self._clock = clock

    async def execute(self, profile: ProfileKey, command: PublishPostCommand, key: IdempotencyKey) -> PublishOutcome:
        scoped_key = self._scoped_key(profile, key)
        request_hash = self._hash(command)

        existing = await self._idempotency.reserve(scoped_key, request_hash, IDEMPOTENCY_TTL)
        if existing is not None:
            return self._replay(existing.state, existing.request_hash, existing.payload, request_hash)

        try:
            outcome = await self._publish(profile, command, scoped_key)
        except BaseException:
            await self._idempotency.release(scoped_key)
            raise
        await self._idempotency.complete(scoped_key, request_hash, dump_outcome(outcome), IDEMPOTENCY_TTL)
        return outcome

    # ---------------------------------------------------------------- steps

    async def _publish(self, profile: ProfileKey, command: PublishPostCommand, scoped_key: str) -> PublishOutcome:
        media, media_expiry_issues = await self._resolve_media(profile, command)
        post = Post(
            caption=Caption(command.caption),
            media=media,
            targets=command.targets,
            schedule_at=command.schedule_at,
        )
        accounts = {a.platform: a for a in await self._publisher.get_connected_accounts(profile)}
        context = ValidationContext(accounts=accounts, is_scheduled=post.is_scheduled)

        issues = self._rules.validate(post, context) + self._schedule_issues(post) + media_expiry_issues
        errors = [i for i in issues if i.is_error]
        if errors:
            raise ValidationFailed(errors)
        warnings = tuple(i for i in issues if not i.is_error)

        network_targets = post.without(Platform.WHATSAPP)
        message_targets = post.targets_for(Platform.WHATSAPP)

        results: list[PlatformPublishResult] = []
        status: PostStatus | None = None
        if network_targets:
            status = await self._publisher.publish(
                profile, replace(post, targets=network_targets), IdempotencyKey(scoped_key[:128])
            )
            results.extend(status.results)
        if message_targets:
            results.extend(await self._send_messages(profile, post, message_targets[0].options))

        merged = PostStatus(
            id=status.id if status else PostId(f"msg_{uuid.uuid4().hex}"),
            state=_overall_state(results, post.is_scheduled),
            created_at=status.created_at if status else self._clock.now(),
            schedule_at=post.schedule_at,
            caption=post.caption.text,
            media_urls=tuple(m.url.value for m in post.media),
            results=tuple(results),
        )
        return PublishOutcome(status=merged, warnings=warnings)

    async def _resolve_media(
        self, profile: ProfileKey, command: PublishPostCommand
    ) -> tuple[tuple[MediaAsset, ...], list[ValidationIssue]]:
        verified = [(index, self._verify(profile, ref, index)) for index, ref in enumerate(command.media)]
        metadata = await asyncio.gather(*(self._inspector.inspect(v.url, v.content_type) for _, v in verified))
        issues: list[ValidationIssue] = []
        assets: list[MediaAsset] = []
        for (index, v), meta in zip(verified, metadata, strict=True):
            assets.append(
                MediaAsset(
                    url=MediaUrl(v.url),
                    kind=meta.kind,
                    mime_type=meta.mime_type,
                    size_bytes=meta.size_bytes,
                    width=meta.width,
                    height=meta.height,
                    duration_seconds=meta.duration_seconds,
                )
            )
            if command.schedule_at is not None and command.schedule_at >= v.expires_at:
                issues.append(
                    ValidationIssue(
                        IssueCode.OPTION_INVALID,
                        None,
                        f"media[{index}]",
                        params={"detail": "Uploaded files are kept for 29 days; schedule earlier or re-upload."},
                    )
                )
        return tuple(assets), issues

    def _verify(self, profile: ProfileKey, ref: MediaReference, index: int) -> VerifiedMedia:
        try:
            return self._signer.verify(profile, ref.url, ref.token)
        except MediaRejected as exc:
            raise MediaRejected(exc.message, field=f"media[{index}]") from exc

    def _schedule_issues(self, post: Post) -> list[ValidationIssue]:
        if post.schedule_at is None:
            return []
        now = self._clock.now()
        if post.schedule_at < now + MIN_SCHEDULE_LEAD:
            return [
                ValidationIssue(
                    IssueCode.SCHEDULE_IN_PAST,
                    None,
                    "scheduleAt",
                    params={"minMinutes": int(MIN_SCHEDULE_LEAD.total_seconds() // 60)},
                )
            ]
        if post.schedule_at > now + MAX_SCHEDULE_AHEAD:
            return [
                ValidationIssue(
                    IssueCode.OPTION_INVALID,
                    None,
                    "scheduleAt",
                    params={"detail": "Posts can be scheduled at most one year ahead."},
                )
            ]
        return []

    async def _send_messages(self, profile: ProfileKey, post: Post, options: object) -> list[PlatformPublishResult]:
        recipients = options.recipients if isinstance(options, WhatsAppOptions) else ()
        media_urls = [m.url.value for m in post.media]
        gate = asyncio.Semaphore(_MESSAGE_CONCURRENCY)

        async def send(recipient: PhoneNumber) -> DirectMessageResult:
            async with gate:
                return await self._messenger.send(profile, recipient, post.caption.text, media_urls)

        sent: Sequence[DirectMessageResult] = await asyncio.gather(*(send(r) for r in recipients))
        failures = [r for r in sent if not r.succeeded]
        if not failures:
            return [PlatformPublishResult(Platform.WHATSAPP, PublishState.PUBLISHED)]
        detail = "; ".join(f"{r.recipient}: {r.error or 'failed'}" for r in failures)
        state = PublishState.FAILED if len(failures) == len(sent) else PublishState.PUBLISHED
        return [
            PlatformPublishResult(
                Platform.WHATSAPP,
                state,
                error=f"{len(failures)}/{len(sent)} not delivered ({detail})",
            )
        ]

    # ---------------------------------------------------------------- idempotency

    @staticmethod
    def _scoped_key(profile: ProfileKey, key: IdempotencyKey) -> str:
        digest = hashlib.sha256(f"{profile.value}\x00{key.value}".encode()).hexdigest()
        return f"pub:{digest}"

    @staticmethod
    def _hash(command: PublishPostCommand) -> str:
        def default(value: Any) -> Any:
            if isinstance(value, Enum):
                return value.value
            if hasattr(value, "isoformat"):
                return value.isoformat()
            raise TypeError(type(value))

        canonical = json.dumps(asdict(command), sort_keys=True, default=default)
        return hashlib.sha256(canonical.encode()).hexdigest()

    @staticmethod
    def _replay(state: RecordState, stored_hash: str, payload: str | None, request_hash: str) -> PublishOutcome:
        if stored_hash != request_hash:
            raise IdempotencyConflict("This Idempotency-Key was already used for a different post.")
        if state is RecordState.IN_PROGRESS or payload is None:
            raise RequestInProgress("This post is still being published. Try again shortly.")
        return load_outcome(payload)


class SchedulePost:
    """Same pipeline as `PublishPost`, but a future `scheduleAt` is mandatory."""

    def __init__(self, publish: PublishPost) -> None:
        self._publish = publish

    async def execute(self, profile: ProfileKey, command: PublishPostCommand, key: IdempotencyKey) -> PublishOutcome:
        if command.schedule_at is None:
            raise ValidationFailed(
                [
                    ValidationIssue(
                        IssueCode.OPTION_INVALID,
                        None,
                        "scheduleAt",
                        params={"detail": "Choose a date and time to schedule."},
                    )
                ]
            )
        return await self._publish.execute(profile, command, key)


def _overall_state(results: Sequence[PlatformPublishResult], scheduled: bool) -> PublishState:
    states = {r.state for r in results}
    if scheduled and states <= {PublishState.SCHEDULED, PublishState.PUBLISHED}:
        return PublishState.SCHEDULED
    if states == {PublishState.PUBLISHED}:
        return PublishState.PUBLISHED
    if states == {PublishState.FAILED}:
        return PublishState.FAILED
    if PublishState.FAILED in states:
        return PublishState.PARTIAL
    return PublishState.PENDING
