from __future__ import annotations

import hashlib
import json
from collections.abc import Sequence
from datetime import datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from blakrasocial.application.dto import ListPostsQuery, Page
from blakrasocial.application.ports import Clock
from blakrasocial.application.ports.repositories import (
    ClaimedTarget,
    DeletionReceipt,
    PendingAuthorization,
    ProfileId,
    StoredPost,
    StoredTarget,
    TargetState,
    TargetUpdate,
)
from blakrasocial.application.ports.secret_cipher import SecretCipher
from blakrasocial.domain.entities import OAuthCredential
from blakrasocial.domain.enums import ContentType, Platform
from blakrasocial.domain.value_objects import PostId
from blakrasocial.infrastructure.persistence import codec
from blakrasocial.infrastructure.persistence.models import (
    AuthorizationStateRow,
    CredentialRow,
    DeletionReceiptRow,
    PostRow,
    ProfileRow,
    TargetRow,
)

Sessions = async_sessionmaker[AsyncSession]


class SqlProfileRepository:
    def __init__(self, sessions: Sessions, clock: Clock) -> None:
        self._sessions = sessions
        self._clock = clock

    async def create(self, profile_id: ProfileId, title: str) -> None:
        async with self._sessions.begin() as session:
            session.add(ProfileRow(id=profile_id, title=title, created_at=self._clock.now()))

    async def exists(self, profile_id: ProfileId) -> bool:
        async with self._sessions() as session:
            return await session.get(ProfileRow, profile_id) is not None


class SqlCredentialRepository:
    def __init__(self, sessions: Sessions, cipher: SecretCipher, clock: Clock) -> None:
        self._sessions = sessions
        self._cipher = cipher
        self._clock = clock

    @staticmethod
    def _context(profile_id: str, platform: str) -> str:
        return f"credential|{profile_id}|{platform}"

    def _load(self, row: CredentialRow) -> OAuthCredential:
        from dataclasses import replace

        data = json.loads(self._cipher.decrypt(row.secret, context=self._context(row.profile_id, row.platform)))
        return replace(codec.load_credential(data), needs_reconnect=row.needs_reconnect)

    async def get(self, profile_id: ProfileId, platform: Platform) -> OAuthCredential | None:
        async with self._sessions() as session:
            row = await session.scalar(
                select(CredentialRow).where(
                    CredentialRow.profile_id == profile_id, CredentialRow.platform == platform.value
                )
            )
            return self._load(row) if row else None

    async def for_profile(self, profile_id: ProfileId) -> list[OAuthCredential]:
        async with self._sessions() as session:
            rows = await session.scalars(select(CredentialRow).where(CredentialRow.profile_id == profile_id))
            return [self._load(r) for r in rows]

    async def save(self, profile_id: ProfileId, credential: OAuthCredential) -> None:
        platform = credential.platform.value
        values = {
            "profile_id": profile_id,
            "platform": platform,
            "account": codec.dump_account(credential.account),
            "secret": self._cipher.encrypt(
                json.dumps(codec.dump_credential(credential)), context=self._context(profile_id, platform)
            ),
            "expires_at": credential.expires_at,
            "needs_reconnect": credential.needs_reconnect,
            "updated_at": self._clock.now(),
            "subject_hash": subject_hash(credential.platform, credential.subject) if credential.subject else None,
        }
        statement = pg_insert(CredentialRow).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[CredentialRow.profile_id, CredentialRow.platform],
            set_={k: statement.excluded[k] for k in values if k not in ("profile_id", "platform")},
        )
        async with self._sessions.begin() as session:
            await session.execute(statement)

    async def delete(self, profile_id: ProfileId, platform: Platform) -> bool:
        async with self._sessions.begin() as session:
            result = await session.execute(
                delete(CredentialRow).where(
                    CredentialRow.profile_id == profile_id, CredentialRow.platform == platform.value
                )
            )
            return bool(getattr(result, "rowcount", 0))

    async def mark_needs_reconnect(self, profile_id: ProfileId, platform: Platform) -> None:
        async with self._sessions.begin() as session:
            await session.execute(
                update(CredentialRow)
                .where(CredentialRow.profile_id == profile_id, CredentialRow.platform == platform.value)
                .values(needs_reconnect=True, updated_at=self._clock.now())
            )

    async def delete_by_subject(self, platform: Platform, subject: str) -> int:
        async with self._sessions.begin() as session:
            result = await session.execute(
                delete(CredentialRow).where(
                    CredentialRow.platform == platform.value,
                    CredentialRow.subject_hash == subject_hash(platform, subject),
                )
            )
            return int(getattr(result, "rowcount", 0) or 0)

    async def expiring(self, before: datetime, limit: int) -> list[tuple[ProfileId, OAuthCredential]]:
        async with self._sessions() as session:
            rows = await session.scalars(
                select(CredentialRow)
                .where(
                    CredentialRow.expires_at.is_not(None),
                    CredentialRow.expires_at < before,
                    CredentialRow.needs_reconnect.is_(False),
                )
                .order_by(CredentialRow.expires_at)
                .limit(limit)
            )
            return [(ProfileId(r.profile_id), self._load(r)) for r in rows]


def subject_hash(platform: Platform, subject: str) -> str:
    return hashlib.sha256(f"{platform.value}|{subject}".encode()).hexdigest()


class SqlDeletionReceiptRepository:
    def __init__(self, sessions: Sessions) -> None:
        self._sessions = sessions

    async def add(self, receipt: DeletionReceipt) -> None:
        async with self._sessions.begin() as session:
            session.add(
                DeletionReceiptRow(
                    code=receipt.code,
                    platform=receipt.platform.value,
                    removed=receipt.removed,
                    requested_at=receipt.requested_at,
                )
            )

    async def get(self, code: str) -> DeletionReceipt | None:
        async with self._sessions() as session:
            row = await session.get(DeletionReceiptRow, code)
            if row is None:
                return None
            return DeletionReceipt(row.code, Platform(row.platform), row.removed, row.requested_at)


class SqlAuthorizationStateRepository:
    def __init__(self, sessions: Sessions, cipher: SecretCipher) -> None:
        self._sessions = sessions
        self._cipher = cipher

    async def put(self, state_hash: str, pending: PendingAuthorization) -> None:
        payload = {
            "codeVerifier": pending.code_verifier,
            "redirectUrl": pending.redirect_url,
            "candidates": [codec.dump_credential(c) for c in pending.candidates],
        }
        async with self._sessions.begin() as session:
            session.add(
                AuthorizationStateRow(
                    state_hash=state_hash,
                    profile_id=pending.profile_id,
                    platform=pending.platform.value,
                    secret=self._cipher.encrypt(json.dumps(payload), context=f"oauth|{state_hash}"),
                    expires_at=pending.expires_at,
                )
            )

    async def take(self, state_hash: str, now: datetime) -> PendingAuthorization | None:
        async with self._sessions.begin() as session:
            # Opportunistic cleanup keeps the table tiny.
            await session.execute(delete(AuthorizationStateRow).where(AuthorizationStateRow.expires_at < now))
            row = (
                await session.execute(
                    delete(AuthorizationStateRow)
                    .where(AuthorizationStateRow.state_hash == state_hash)
                    .returning(AuthorizationStateRow)
                )
            ).scalar_one_or_none()
            if row is None:
                return None
            payload = json.loads(self._cipher.decrypt(row.secret, context=f"oauth|{state_hash}"))
            return PendingAuthorization(
                profile_id=ProfileId(row.profile_id),
                platform=Platform(row.platform),
                expires_at=row.expires_at,
                code_verifier=payload.get("codeVerifier"),
                redirect_url=payload.get("redirectUrl"),
                candidates=tuple(codec.load_credential(c) for c in payload.get("candidates") or []),
            )


class SqlPostRepository:
    def __init__(self, sessions: Sessions) -> None:
        self._sessions = sessions

    async def add(self, profile_id: ProfileId, post: StoredPost) -> StoredPost:
        async with self._sessions.begin() as session:
            existing = await session.scalar(
                select(PostRow).where(PostRow.profile_id == profile_id, PostRow.idempotency_key == post.idempotency_key)
            )
            if existing is not None:
                return _to_post(existing)
            row = PostRow(
                id=post.id.value,
                profile_id=profile_id,
                caption=post.caption,
                media=codec.dump_media(post.media),
                idempotency_key=post.idempotency_key,
                schedule_at=post.schedule_at,
                created_at=post.created_at,
                targets=[
                    TargetRow(
                        platform=t.platform.value,
                        content_type=t.content_type.value,
                        options=codec.dump_options(t.options),
                        state=t.state.value,
                        due_at=t.due_at,
                        attempts=0,
                    )
                    for t in post.targets
                ],
            )
            session.add(row)
            await session.flush()
            return _to_post(row)

    async def get(self, profile_id: ProfileId, post_id: PostId) -> StoredPost | None:
        async with self._sessions() as session:
            row = await session.scalar(
                select(PostRow).where(PostRow.id == post_id.value, PostRow.profile_id == profile_id)
            )
            return _to_post(row) if row else None

    async def list(self, profile_id: ProfileId, query: ListPostsQuery, since: datetime) -> Page[StoredPost]:
        conditions = [PostRow.profile_id == profile_id, PostRow.created_at >= since]
        if query.platform is not None:
            conditions.append(
                PostRow.id.in_(select(TargetRow.post_id).where(TargetRow.platform == query.platform.value))
            )
        async with self._sessions() as session:
            total = await session.scalar(select(func.count()).select_from(PostRow).where(*conditions))
            rows = await session.scalars(
                select(PostRow).where(*conditions).order_by(PostRow.created_at.desc()).limit(query.limit)
            )
            return Page(items=tuple(_to_post(r) for r in rows), total=total)

    async def claim_due(self, now: datetime, limit: int, lease: timedelta) -> Sequence[ClaimedTarget]:
        runnable = (TargetState.QUEUED.value, TargetState.PROCESSING.value)
        async with self._sessions.begin() as session:
            due_ids = (
                select(TargetRow.id)
                .where(
                    TargetRow.state.in_(runnable),
                    TargetRow.due_at <= now,
                    (TargetRow.lease_until.is_(None)) | (TargetRow.lease_until < now),
                )
                .order_by(TargetRow.due_at)
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
            claimed_ids = (
                await session.scalars(
                    update(TargetRow)
                    .where(TargetRow.id.in_(due_ids))
                    .values(lease_until=now + lease, attempts=TargetRow.attempts + 1)
                    .returning(TargetRow.id)
                )
            ).all()
            if not claimed_ids:
                return []
            targets = (
                await session.scalars(
                    select(TargetRow).where(TargetRow.id.in_(claimed_ids)).execution_options(populate_existing=True)
                )
            ).all()
            posts = {
                p.id: p
                for p in await session.scalars(select(PostRow).where(PostRow.id.in_({t.post_id for t in targets})))
            }
            return [
                ClaimedTarget(ProfileId(posts[t.post_id].profile_id), _to_post(posts[t.post_id]), _to_target(t))
                for t in targets
            ]

    async def update_target(self, target_id: int, change: TargetUpdate) -> None:
        values: dict[str, object] = {
            "state": change.state.value,
            "remote_id": change.remote_id,
            "url": change.url,
            "error": change.error,
            "poll_handle": change.poll_handle,
            "lease_until": None,
        }
        if change.next_run_at is not None:
            values["due_at"] = change.next_run_at
        async with self._sessions.begin() as session:
            if change.state is TargetState.PROCESSING:
                previous = await session.scalar(select(TargetRow.state).where(TargetRow.id == target_id))
                if previous != TargetState.PROCESSING.value:
                    values["attempts"] = 0  # polling has its own budget
            await session.execute(update(TargetRow).where(TargetRow.id == target_id).values(**values))


def _to_target(row: TargetRow) -> StoredTarget:
    platform = Platform(row.platform)
    return StoredTarget(
        id=row.id,
        platform=platform,
        content_type=ContentType(row.content_type),
        options=codec.load_options(platform, row.options),
        state=TargetState(row.state),
        due_at=row.due_at,
        attempts=row.attempts,
        remote_id=row.remote_id,
        url=row.url,
        error=row.error,
        poll_handle=row.poll_handle,
    )


def _to_post(row: PostRow) -> StoredPost:
    return StoredPost(
        id=PostId(row.id),
        caption=row.caption,
        media=codec.load_media(row.media),
        targets=tuple(_to_target(t) for t in row.targets),
        created_at=row.created_at,
        idempotency_key=row.idempotency_key,
        schedule_at=row.schedule_at,
    )
