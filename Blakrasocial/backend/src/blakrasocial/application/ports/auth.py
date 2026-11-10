from __future__ import annotations

from typing import Protocol

from blakrasocial.application.dto import CallerIdentity


class CallerAuthenticator(Protocol):
    async def authenticate(self, bearer_token: str) -> CallerIdentity:
        """Raise `Unauthorized` unless the token was issued by the host platform."""
        ...
