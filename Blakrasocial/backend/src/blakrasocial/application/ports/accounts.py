"""Built-in customer accounts: an admin invites customers; they set a password and sign in."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Protocol

from blakrasocial.domain.value_objects import ProfileKey


class UserRole(StrEnum):
    ADMIN = "admin"
    CUSTOMER = "customer"


@dataclass(frozen=True, slots=True)
class User:
    id: str
    email: str
    title: str
    role: UserRole
    profile_key: ProfileKey
    password_hash: str | None
    disabled: bool
    created_at: datetime
    last_login_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class RefreshSession:
    id: str
    user_id: str
    family: str  # all rotations of one sign-in share a family; reuse of an old token revokes it
    expires_at: datetime
    revoked: bool


@dataclass(frozen=True, slots=True)
class Invite:
    user_id: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class IssuedToken:
    token: str
    expires_in_seconds: int


class UserRepository(Protocol):
    async def add(self, user: User) -> None:
        """Raises `Conflict` if the email is taken."""
        ...

    async def by_email(self, email: str) -> User | None: ...

    async def by_id(self, user_id: str) -> User | None: ...

    async def list(self) -> list[User]: ...

    async def set_password(self, user_id: str, password_hash: str) -> None: ...

    async def set_disabled(self, user_id: str, disabled: bool) -> None: ...

    async def touch_login(self, user_id: str, at: datetime) -> None: ...

    async def count_admins(self) -> int: ...


class SessionRepository(Protocol):
    async def add(self, token_hash: str, session: RefreshSession) -> None: ...

    async def get(self, token_hash: str) -> RefreshSession | None: ...

    async def revoke(self, session_id: str) -> None: ...

    async def revoke_family(self, family: str) -> None: ...

    async def revoke_user(self, user_id: str) -> None: ...


class InviteRepository(Protocol):
    async def put(self, token_hash: str, invite: Invite) -> None:
        """Stores the invite and removes the user's earlier ones (only the newest link works)."""
        ...

    async def peek(self, token_hash: str, now: datetime) -> Invite | None: ...

    async def take(self, token_hash: str, now: datetime) -> Invite | None:
        """Atomically returns and deletes an unexpired invite (each link works once)."""
        ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password_hash: str, password: str) -> bool: ...

    def needs_rehash(self, password_hash: str) -> bool: ...

    def dummy_verify(self) -> None:
        """Same work as a real check, so unknown emails can't be told apart by timing."""
        ...


class AccessTokenIssuer(Protocol):
    def issue(self, user: User) -> IssuedToken: ...


class LoginThrottle(Protocol):
    async def check(self, key: str) -> int | None:
        """Seconds to wait if `key` is locked out, else None."""
        ...

    async def failed(self, key: str) -> None: ...

    async def reset(self, key: str) -> None: ...
