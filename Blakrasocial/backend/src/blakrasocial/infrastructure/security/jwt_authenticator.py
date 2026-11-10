from __future__ import annotations

import asyncio
from collections.abc import Sequence

import jwt

from blakrasocial.application.dto import CallerIdentity
from blakrasocial.application.errors import Unauthorized
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import ProfileKey


class JwtCallerAuthenticator:
    """Verifies access tokens issued by the host platform.

    Use a JWKS URL (RS256/ES256, recommended) or a shared HS256 secret. The token must
    carry the customer's profile key in `profile_key_claim`; requests may only act on it.
    """

    def __init__(
        self,
        *,
        issuer: str,
        audience: str,
        algorithms: Sequence[str],
        profile_key_claim: str = "profile_key",
        jwks_url: str | None = None,
        secret: str | None = None,
        leeway_seconds: int = 30,
    ) -> None:
        if (jwks_url is None) == (secret is None):
            raise ValueError("Provide exactly one of jwks_url or secret")
        self._issuer = issuer
        self._audience = audience
        self._algorithms = list(algorithms)
        self._claim = profile_key_claim
        self._secret = secret
        self._jwks = jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=600) if jwks_url else None
        self._leeway = leeway_seconds

    async def authenticate(self, bearer_token: str) -> CallerIdentity:
        try:
            key = await self._signing_key(bearer_token)
            claims = jwt.decode(
                bearer_token,
                key=key,
                algorithms=self._algorithms,
                audience=self._audience,
                issuer=self._issuer,
                leeway=self._leeway,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
        except jwt.PyJWTError as exc:
            raise Unauthorized("Invalid or expired access token.") from exc

        raw_profile = claims.get(self._claim)
        try:
            profile = ProfileKey(str(raw_profile)) if raw_profile else None
        except InvalidValue as exc:
            raise Unauthorized("Access token carries an invalid profile key.") from exc
        scopes = claims.get("scope", "")
        return CallerIdentity(
            subject=str(claims["sub"]),
            profile_key=profile,
            scopes=frozenset(scopes.split() if isinstance(scopes, str) else scopes),
        )

    async def _signing_key(self, token: str):  # type: ignore[no-untyped-def]
        if self._jwks is None:
            return self._secret
        # PyJWKClient does blocking HTTP on cache misses; keep it off the event loop.
        signing_key = await asyncio.to_thread(self._jwks.get_signing_key_from_jwt, token)
        return signing_key.key
