from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta

from blakrasocial.application.direct.registry import NetworkRegistry
from blakrasocial.application.errors import NotFound, ProviderRejected, Unauthorized
from blakrasocial.application.ports import Clock
from blakrasocial.application.ports.repositories import (
    AuthorizationStateRepository,
    CredentialRepository,
    PendingAuthorization,
    ProfileId,
    ProfileRepository,
    profile_id_of,
)
from blakrasocial.domain.entities import ConnectedAccount, ConnectUrl, OAuthCredential
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import ProfileKey

STATE_TTL = timedelta(minutes=10)


@dataclass(frozen=True, slots=True)
class LinkOutcome:
    """Result of a consent round trip: either connected, or a choice to make (e.g. which Facebook Page)."""

    platform: Platform
    redirect_url: str | None
    connected: ConnectedAccount | None = None
    choices: tuple[tuple[str, ConnectedAccount], ...] = ()
    selection_token: str | None = None


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _pkce_challenge(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()


class AccountLinker:
    """Runs the OAuth authorization-code flow (state + PKCE) and stores the resulting credentials.

    `state` is random, single-use, expires in 10 minutes and is stored only as a hash, so a stolen
    or replayed callback URL can't attach an account to someone else's profile.
    """

    def __init__(
        self,
        registry: NetworkRegistry,
        profiles: ProfileRepository,
        credentials: CredentialRepository,
        states: AuthorizationStateRepository,
        clock: Clock,
        callback_base: str,
    ) -> None:
        self._registry = registry
        self._profiles = profiles
        self._credentials = credentials
        self._states = states
        self._clock = clock
        self._callback_base = callback_base.rstrip("/")

    def redirect_uri(self, platform: Platform) -> str:
        return f"{self._callback_base}/oauth/{platform.value}/callback"

    async def start(self, profile: ProfileKey, platform: Platform | None, redirect_url: str | None) -> ConnectUrl:
        if platform is None:
            raise InvalidValue("platform", "choose the network to connect")
        provider = self._registry.get(platform).provider
        pid = await self._existing_profile(profile)
        state = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64) if provider.uses_pkce else None
        expires_at = self._clock.now() + STATE_TTL
        await self._states.put(
            _hash(state),
            PendingAuthorization(pid, platform, expires_at, code_verifier=verifier, redirect_url=redirect_url),
        )
        url = provider.authorization_url(
            state=state,
            redirect_uri=self.redirect_uri(platform),
            code_challenge=_pkce_challenge(verifier) if verifier else None,
        )
        return ConnectUrl(url=url, expires_at=expires_at)

    async def complete(self, platform: Platform, code: str, state: str) -> LinkOutcome:
        pending = await self._take(state, platform)
        provider = self._registry.get(platform).provider
        credentials = await provider.exchange_code(
            code=code, redirect_uri=self.redirect_uri(platform), code_verifier=pending.code_verifier
        )
        if not credentials:
            raise ProviderRejected(_NO_ACCOUNT.get(platform, "No account was found to connect."))
        if len(credentials) == 1:
            await self._credentials.save(pending.profile_id, credentials[0])
            return LinkOutcome(platform, pending.redirect_url, connected=credentials[0].account)

        token = secrets.token_urlsafe(32)
        await self._states.put(
            _hash(token),
            PendingAuthorization(
                pending.profile_id,
                platform,
                self._clock.now() + STATE_TTL,
                redirect_url=pending.redirect_url,
                candidates=tuple(credentials),
            ),
        )
        return LinkOutcome(
            platform,
            pending.redirect_url,
            choices=tuple((c.account_id, c.account) for c in credentials),
            selection_token=token,
        )

    async def choose(self, platform: Platform, selection_token: str, account_id: str) -> LinkOutcome:
        pending = await self._take(selection_token, platform)
        chosen: OAuthCredential | None = next((c for c in pending.candidates if c.account_id == account_id), None)
        if chosen is None:
            raise InvalidValue("accountId", "is not one of the accounts offered")
        await self._credentials.save(pending.profile_id, chosen)
        return LinkOutcome(platform, pending.redirect_url, connected=chosen.account)

    async def list(self, profile: ProfileKey) -> list[ConnectedAccount]:
        from dataclasses import replace

        now = self._clock.now()
        credentials = await self._credentials.for_profile(profile_id_of(profile))
        return [replace(c.account, needs_reconnect=not c.is_usable(now)) for c in credentials]

    async def unlink(self, profile: ProfileKey, platform: Platform) -> None:
        if not await self._credentials.delete(profile_id_of(profile), platform):
            raise NotFound(f"{platform.value.title()} isn't connected.")

    async def _existing_profile(self, profile: ProfileKey) -> ProfileId:
        pid = profile_id_of(profile)
        if not await self._profiles.exists(pid):
            raise NotFound("Unknown profile.")
        return pid

    async def _take(self, token: str, platform: Platform) -> PendingAuthorization:
        pending = await self._states.take(_hash(token), self._clock.now()) if token else None
        if pending is None or pending.platform is not platform:
            raise Unauthorized("This connection link has expired or was already used. Please start again.")
        return pending


_NO_ACCOUNT = {
    Platform.FACEBOOK: "No Facebook Page was shared. Connect again and select at least one Page you manage.",
    Platform.INSTAGRAM: "No Instagram professional account was found. Switch to a Business or Creator account.",
}
