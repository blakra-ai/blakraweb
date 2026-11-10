"""Use cases for built-in accounts: invite → set password → sign in → short access token + rotating
refresh session. Admins create customers (each gets their own publishing profile)."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass, replace
from datetime import timedelta

from blakrasocial.application.errors import Conflict, Forbidden, NotFound, TooManyAttempts, Unauthorized
from blakrasocial.application.ports import Clock, SocialPublisher
from blakrasocial.application.ports.accounts import (
    AccessTokenIssuer,
    Invite,
    InviteRepository,
    IssuedToken,
    LoginThrottle,
    PasswordHasher,
    RefreshSession,
    SessionRepository,
    User,
    UserRepository,
    UserRole,
)
from blakrasocial.domain.errors import InvalidValue

MIN_PASSWORD = 10
MAX_PASSWORD = 128
_BAD_LOGIN = "Email or password is incorrect."


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def normalize_email(email: str) -> str:
    value = email.strip().lower()
    local, _, domain = value.partition("@")
    if not local or "." not in domain or len(value) > 254 or any(c.isspace() for c in value):
        raise InvalidValue("email", "is not a valid email address")
    return value


def check_password(password: str, email: str) -> None:
    if not MIN_PASSWORD <= len(password) <= MAX_PASSWORD:
        raise InvalidValue("password", f"must be {MIN_PASSWORD}-{MAX_PASSWORD} characters")
    if (
        len(set(password)) < 4
        or password.lower() == email.lower()
        or email.split("@", maxsplit=1)[0].lower() in password.lower()
    ):
        raise InvalidValue("password", "is too easy to guess")


@dataclass(frozen=True, slots=True)
class AccountPolicy:
    refresh_ttl: timedelta = timedelta(days=30)
    invite_ttl: timedelta = timedelta(days=7)


@dataclass(frozen=True, slots=True)
class SignedIn:
    user: User
    access: IssuedToken
    refresh_token: str
    refresh_expires_in_seconds: int


@dataclass(frozen=True, slots=True)
class InviteLink:
    user: User
    token: str  # the frontend builds <app>/invite/<token>
    expires_in_seconds: int


class Sessions:
    """Shared by the use cases that end with the user signed in."""

    def __init__(
        self, sessions: SessionRepository, issuer: AccessTokenIssuer, clock: Clock, policy: AccountPolicy
    ) -> None:
        self._sessions = sessions
        self._issuer = issuer
        self._clock = clock
        self._policy = policy

    async def start(self, user: User, family: str | None = None) -> SignedIn:
        raw = secrets.token_urlsafe(32)
        expires = self._clock.now() + self._policy.refresh_ttl
        session = RefreshSession(uuid.uuid4().hex, user.id, family or uuid.uuid4().hex, expires, revoked=False)
        await self._sessions.add(token_hash(raw), session)
        return SignedIn(user, self._issuer.issue(user), raw, int(self._policy.refresh_ttl.total_seconds()))


class SignIn:
    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher,
        throttle: LoginThrottle,
        sessions: Sessions,
        clock: Clock,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._throttle = throttle
        self._sessions = sessions
        self._clock = clock

    async def execute(self, email: str, password: str, client_ip: str) -> SignedIn:
        try:
            email = normalize_email(email)
        except InvalidValue as exc:
            raise Unauthorized(_BAD_LOGIN) from exc
        keys = (f"email:{email}", f"ip:{client_ip}")
        for key in keys:
            if (wait := await self._throttle.check(key)) is not None:
                raise TooManyAttempts("Too many sign-in attempts. Try again in a few minutes.", wait)

        user = await self._users.by_email(email)
        if user is None or user.password_hash is None:
            self._hasher.dummy_verify()
            ok = False
        else:
            ok = self._hasher.verify(user.password_hash, password)
        if not ok or user is None or user.disabled:
            for key in keys:
                await self._throttle.failed(key)
            raise Unauthorized(_BAD_LOGIN)

        for key in keys:
            await self._throttle.reset(key)
        assert user.password_hash is not None
        if self._hasher.needs_rehash(user.password_hash):
            await self._users.set_password(user.id, self._hasher.hash(password))
        await self._users.touch_login(user.id, self._clock.now())
        return await self._sessions.start(user)


class RefreshAccess:
    """Rotates the refresh token on every use; a reused (stolen) token ends the whole sign-in."""

    def __init__(self, users: UserRepository, sessions: SessionRepository, starter: Sessions, clock: Clock) -> None:
        self._users = users
        self._sessions = sessions
        self._starter = starter
        self._clock = clock

    async def execute(self, refresh_token: str | None) -> SignedIn:
        if not refresh_token:
            raise Unauthorized("Please sign in.")
        session = await self._sessions.get(token_hash(refresh_token))
        if session is None:
            raise Unauthorized("Please sign in.")
        if session.revoked:
            await self._sessions.revoke_family(session.family)
            raise Unauthorized("Please sign in again.")
        if session.expires_at <= self._clock.now():
            raise Unauthorized("Your session expired. Please sign in again.")
        user = await self._users.by_id(session.user_id)
        if user is None or user.disabled:
            await self._sessions.revoke_family(session.family)
            raise Unauthorized("Please sign in.")
        await self._sessions.revoke(session.id)
        return await self._starter.start(user, family=session.family)


class SignOut:
    def __init__(self, sessions: SessionRepository) -> None:
        self._sessions = sessions

    async def execute(self, refresh_token: str | None) -> None:
        if refresh_token and (session := await self._sessions.get(token_hash(refresh_token))) is not None:
            await self._sessions.revoke_family(session.family)


class Invitations:
    def __init__(self, invites: InviteRepository, clock: Clock, policy: AccountPolicy) -> None:
        self._invites = invites
        self._clock = clock
        self._policy = policy

    async def issue(self, user: User) -> InviteLink:
        raw = secrets.token_urlsafe(32)
        await self._invites.put(token_hash(raw), Invite(user.id, self._clock.now() + self._policy.invite_ttl))
        return InviteLink(user, raw, int(self._policy.invite_ttl.total_seconds()))


class InspectInvite:
    def __init__(self, invites: InviteRepository, users: UserRepository, clock: Clock) -> None:
        self._invites = invites
        self._users = users
        self._clock = clock

    async def execute(self, token: str) -> User:
        invite = await self._invites.peek(token_hash(token), self._clock.now())
        user = await self._users.by_id(invite.user_id) if invite else None
        if user is None or user.disabled:
            raise NotFound("This link has expired or was already used. Ask for a new one.")
        return user


class AcceptInvite:
    """Sets the password from an invite or reset link, ends older sessions and signs the user in."""

    def __init__(
        self,
        invites: InviteRepository,
        users: UserRepository,
        sessions: SessionRepository,
        hasher: PasswordHasher,
        starter: Sessions,
        clock: Clock,
    ) -> None:
        self._invites = invites
        self._users = users
        self._sessions = sessions
        self._hasher = hasher
        self._starter = starter
        self._clock = clock

    async def execute(self, token: str, password: str) -> SignedIn:
        peeked = await self._invites.peek(token_hash(token), self._clock.now())
        user = await self._users.by_id(peeked.user_id) if peeked else None
        if user is None or user.disabled:
            raise NotFound("This link has expired or was already used. Ask for a new one.")
        check_password(password, user.email)
        if await self._invites.take(token_hash(token), self._clock.now()) is None:
            raise NotFound("This link has expired or was already used. Ask for a new one.")
        password_hash = self._hasher.hash(password)
        await self._users.set_password(user.id, password_hash)
        await self._sessions.revoke_user(user.id)
        await self._users.touch_login(user.id, self._clock.now())
        return await self._starter.start(replace(user, password_hash=password_hash))


class ChangePassword:
    def __init__(
        self, users: UserRepository, sessions: SessionRepository, hasher: PasswordHasher, starter: Sessions
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._hasher = hasher
        self._starter = starter

    async def execute(self, user_id: str, current: str, new: str) -> SignedIn:
        user = await self._users.by_id(user_id)
        if user is None or user.disabled or user.password_hash is None:
            raise Unauthorized("Please sign in.")
        if not self._hasher.verify(user.password_hash, current):
            raise InvalidValue("currentPassword", "is incorrect")
        check_password(new, user.email)
        password_hash = self._hasher.hash(new)
        await self._users.set_password(user.id, password_hash)
        await self._sessions.revoke_user(user.id)  # signs out every other device
        return await self._starter.start(replace(user, password_hash=password_hash))


class CurrentUser:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user_id: str) -> User:
        user = await self._users.by_id(user_id)
        if user is None or user.disabled:
            raise Unauthorized("Please sign in.")
        return user


class ManageCustomers:
    """Admin-only: create customers (each with their own publishing profile), resend links, disable."""

    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        publisher: SocialPublisher,
        invitations: Invitations,
        clock: Clock,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._publisher = publisher
        self._invitations = invitations
        self._clock = clock

    async def list(self) -> list[User]:
        return sorted(await self._users.list(), key=lambda u: u.created_at, reverse=True)

    async def create(self, email: str, title: str, role: UserRole = UserRole.CUSTOMER) -> InviteLink:
        email = normalize_email(email)
        title = title.strip()
        if not 1 <= len(title) <= 120:
            raise InvalidValue("title", "must be 1-120 characters")
        if await self._users.by_email(email) is not None:
            raise Conflict("A user with this email already exists.")
        profile_key = await self._publisher.create_profile(title)
        user = User(uuid.uuid4().hex, email, title, role, profile_key, None, False, self._clock.now())
        await self._users.add(user)
        return await self._invitations.issue(user)

    async def new_link(self, user_id: str) -> InviteLink:
        user = await self._users.by_id(user_id)
        if user is None:
            raise NotFound("Unknown user.")
        return await self._invitations.issue(user)

    async def set_disabled(self, actor_id: str, user_id: str, disabled: bool) -> User:
        user = await self._users.by_id(user_id)
        if user is None:
            raise NotFound("Unknown user.")
        if disabled and user_id == actor_id:
            raise Forbidden("You can't disable your own account.")
        await self._users.set_disabled(user_id, disabled)
        if disabled:
            await self._sessions.revoke_user(user_id)
        return replace(user, disabled=disabled)


class BootstrapAdmin:
    """First run (command line): creates the owner's admin account and returns its set-password link."""

    def __init__(self, users: UserRepository, customers: ManageCustomers) -> None:
        self._users = users
        self._customers = customers

    async def execute(self, email: str, title: str) -> InviteLink:
        existing = await self._users.by_email(normalize_email(email))
        if existing is not None:
            if existing.role is not UserRole.ADMIN:
                raise Conflict("This email belongs to a customer account.")
            return await self._customers.new_link(existing.id)  # forgot the password: new link
        return await self._customers.create(email, title, UserRole.ADMIN)
