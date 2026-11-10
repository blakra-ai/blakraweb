from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from blakrasocial.application.errors import Conflict
from blakrasocial.application.ports.accounts import Invite, RefreshSession, User, UserRole
from blakrasocial.application.ports.secret_cipher import SecretCipher
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.persistence.models import InviteRow, SessionRow, UserRow

Sessions = async_sessionmaker[AsyncSession]


class SqlUserRepository:
    def __init__(self, sessions: Sessions, cipher: SecretCipher) -> None:
        self._sessions = sessions
        self._cipher = cipher

    @staticmethod
    def _context(user_id: str) -> str:
        return f"user|{user_id}"

    def _load(self, row: UserRow) -> User:
        return User(
            id=row.id,
            email=row.email,
            title=row.title,
            role=UserRole(row.role),
            profile_key=ProfileKey(self._cipher.decrypt(row.profile_secret, context=self._context(row.id))),
            password_hash=row.password_hash,
            disabled=row.disabled,
            created_at=row.created_at,
            last_login_at=row.last_login_at,
        )

    async def add(self, user: User) -> None:
        row = UserRow(
            id=user.id,
            email=user.email,
            title=user.title,
            role=user.role.value,
            profile_secret=self._cipher.encrypt(user.profile_key.value, context=self._context(user.id)),
            password_hash=user.password_hash,
            disabled=user.disabled,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )
        try:
            async with self._sessions.begin() as session:
                session.add(row)
        except IntegrityError as exc:
            raise Conflict("A user with this email already exists.") from exc

    async def by_email(self, email: str) -> User | None:
        async with self._sessions() as session:
            row = await session.scalar(select(UserRow).where(UserRow.email == email))
            return self._load(row) if row else None

    async def by_id(self, user_id: str) -> User | None:
        async with self._sessions() as session:
            row = await session.get(UserRow, user_id)
            return self._load(row) if row else None

    async def list(self) -> list[User]:
        async with self._sessions() as session:
            return [self._load(r) for r in await session.scalars(select(UserRow))]

    async def _update(self, user_id: str, **values: object) -> None:
        async with self._sessions.begin() as session:
            await session.execute(update(UserRow).where(UserRow.id == user_id).values(**values))

    async def set_password(self, user_id: str, password_hash: str) -> None:
        await self._update(user_id, password_hash=password_hash)

    async def set_disabled(self, user_id: str, disabled: bool) -> None:
        await self._update(user_id, disabled=disabled)

    async def touch_login(self, user_id: str, at: datetime) -> None:
        await self._update(user_id, last_login_at=at)

    async def count_admins(self) -> int:
        async with self._sessions() as session:
            return int(await session.scalar(select(func.count()).where(UserRow.role == UserRole.ADMIN.value)) or 0)

    async def delete(self, user_id: str) -> None:
        async with self._sessions.begin() as session:  # sessions and invites go with it (ON DELETE CASCADE)
            await session.execute(delete(UserRow).where(UserRow.id == user_id))


class SqlSessionRepository:
    def __init__(self, sessions: Sessions) -> None:
        self._sessions = sessions

    async def add(self, token_hash: str, session: RefreshSession) -> None:
        async with self._sessions.begin() as db:
            db.add(
                SessionRow(
                    token_hash=token_hash,
                    id=session.id,
                    user_id=session.user_id,
                    family=session.family,
                    expires_at=session.expires_at,
                    revoked=session.revoked,
                )
            )

    async def get(self, token_hash: str) -> RefreshSession | None:
        async with self._sessions() as db:
            row = await db.get(SessionRow, token_hash)
            if row is None:
                return None
            return RefreshSession(row.id, row.user_id, row.family, row.expires_at, row.revoked)

    async def _revoke(self, *where: object) -> None:
        async with self._sessions.begin() as db:
            await db.execute(update(SessionRow).where(*where).values(revoked=True))  # type: ignore[arg-type]

    async def revoke(self, session_id: str) -> None:
        await self._revoke(SessionRow.id == session_id)

    async def revoke_family(self, family: str) -> None:
        await self._revoke(SessionRow.family == family)

    async def revoke_user(self, user_id: str) -> None:
        await self._revoke(SessionRow.user_id == user_id)

    async def purge(self, before: datetime) -> int:
        """Housekeeping: drop sessions that expired before `before`."""
        async with self._sessions.begin() as db:
            result = await db.execute(delete(SessionRow).where(SessionRow.expires_at < before))
            return int(getattr(result, "rowcount", 0) or 0)


class SqlInviteRepository:
    def __init__(self, sessions: Sessions) -> None:
        self._sessions = sessions

    async def put(self, token_hash: str, invite: Invite) -> None:
        async with self._sessions.begin() as db:
            await db.execute(delete(InviteRow).where(InviteRow.user_id == invite.user_id))
            db.add(InviteRow(token_hash=token_hash, user_id=invite.user_id, expires_at=invite.expires_at))

    async def peek(self, token_hash: str, now: datetime) -> Invite | None:
        async with self._sessions() as db:
            row = await db.get(InviteRow, token_hash)
            return Invite(row.user_id, row.expires_at) if row and row.expires_at > now else None

    async def take(self, token_hash: str, now: datetime) -> Invite | None:
        async with self._sessions.begin() as db:
            row = (
                await db.execute(
                    delete(InviteRow)
                    .where(InviteRow.token_hash == token_hash, InviteRow.expires_at > now)
                    .returning(InviteRow.user_id, InviteRow.expires_at)
                )
            ).first()
            return Invite(row.user_id, row.expires_at) if row else None
