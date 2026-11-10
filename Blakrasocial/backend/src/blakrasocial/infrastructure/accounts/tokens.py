"""Short-lived access tokens for built-in accounts (HS256, our own issuer and audience)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt

from blakrasocial.application.dto import CallerIdentity
from blakrasocial.application.errors import Unauthorized
from blakrasocial.application.ports.accounts import IssuedToken, User, UserRole
from blakrasocial.application.ports.auth import CallerAuthenticator
from blakrasocial.domain.value_objects import ProfileKey

BUILTIN_ISSUER = "blakrasocial"
BUILTIN_AUDIENCE = "blakrasocial-app"
ADMIN_SCOPE = "admin"


class JwtAccessTokenIssuer:
    def __init__(
        self, secret: str, ttl: timedelta = timedelta(minutes=15), now: Callable[[], datetime] | None = None
    ) -> None:
        self._secret = secret
        self._ttl = ttl
        self._now = now or (lambda: datetime.now(UTC))

    def issue(self, user: User) -> IssuedToken:
        now = self._now()
        claims = {
            "iss": BUILTIN_ISSUER,
            "aud": BUILTIN_AUDIENCE,
            "sub": user.id,
            "iat": int(now.timestamp()),
            "exp": int((now + self._ttl).timestamp()),
            "jti": uuid.uuid4().hex,
            "profile_key": user.profile_key.value,
            "scope": ADMIN_SCOPE if user.role is UserRole.ADMIN else "",
        }
        return IssuedToken(jwt.encode(claims, self._secret, algorithm="HS256"), int(self._ttl.total_seconds()))


class BuiltinTokenAuthenticator:
    def __init__(self, secret: str) -> None:
        self._secret = secret

    async def authenticate(self, bearer_token: str) -> CallerIdentity:
        try:
            claims = jwt.decode(
                bearer_token,
                key=self._secret,
                algorithms=["HS256"],
                audience=BUILTIN_AUDIENCE,
                issuer=BUILTIN_ISSUER,
                leeway=10,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
        except jwt.PyJWTError as exc:
            raise Unauthorized("Invalid or expired access token.") from exc
        scope = str(claims.get("scope") or "")
        return CallerIdentity(
            subject=str(claims["sub"]),
            profile_key=ProfileKey(str(claims["profile_key"])),
            scopes=frozenset(scope.split()),
        )


class CompositeAuthenticator:
    """Accepts our own tokens and, if configured, tokens from an external host platform."""

    def __init__(self, builtin: BuiltinTokenAuthenticator | None, external: CallerAuthenticator | None) -> None:
        self._builtin = builtin
        self._external = external

    async def authenticate(self, bearer_token: str) -> CallerIdentity:
        try:
            issuer = jwt.decode(bearer_token, options={"verify_signature": False}).get("iss")
        except jwt.PyJWTError as exc:
            raise Unauthorized("Invalid access token.") from exc
        if issuer == BUILTIN_ISSUER and self._builtin is not None:
            return await self._builtin.authenticate(bearer_token)
        if self._external is not None:
            return await self._external.authenticate(bearer_token)
        raise Unauthorized("Invalid access token.")
