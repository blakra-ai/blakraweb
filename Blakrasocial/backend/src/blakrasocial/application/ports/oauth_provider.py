from __future__ import annotations

from datetime import timedelta
from typing import Protocol

from blakrasocial.domain.entities import OAuthCredential
from blakrasocial.domain.enums import Platform


class OAuthProvider(Protocol):
    """One network's authorization-code flow. The consent screen is always the network's own site."""

    @property
    def platform(self) -> Platform: ...

    @property
    def uses_pkce(self) -> bool: ...

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str: ...

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        """Usually one credential; Facebook returns one per Page the user manages."""
        ...

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        """Returns a fresher credential, or raises `ProviderAuthError` when the user must reconnect."""
        ...

    @property
    def refresh_ahead(self) -> timedelta | None:
        """How long before expiry to refresh; None when the network has no refresh (reconnect instead)."""
        ...
