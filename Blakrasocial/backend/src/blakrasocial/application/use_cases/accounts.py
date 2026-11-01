from __future__ import annotations

from blakrasocial.application.dto import ConnectAccountCommand
from blakrasocial.application.ports import SocialPublisher
from blakrasocial.domain.entities import ConnectedAccount, ConnectUrl
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import ProfileKey


class ConnectAccount:
    """Returns the provider-hosted linking page (OAuth consent happens on each network's site)."""

    def __init__(self, publisher: SocialPublisher, allowed_redirect_origins: frozenset[str]) -> None:
        self._publisher = publisher
        self._allowed_origins = allowed_redirect_origins

    async def execute(self, profile: ProfileKey, command: ConnectAccountCommand) -> ConnectUrl:
        from blakrasocial.domain.errors import InvalidValue

        for name, value in (("redirectUrl", command.redirect_url), ("origin", command.origin)):
            if value is not None and not self._is_allowed(value):
                raise InvalidValue(name, "is not an allowed origin for this deployment")
        return await self._publisher.get_connect_url(profile, command.platform, command.redirect_url, command.origin)

    def _is_allowed(self, url: str) -> bool:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}" in self._allowed_origins


class ListAccounts:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, profile: ProfileKey) -> list[ConnectedAccount]:
        accounts = await self._publisher.get_connected_accounts(profile)
        order = list(Platform)
        return sorted(accounts, key=lambda a: order.index(a.platform))


class UnlinkAccount:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, profile: ProfileKey, platform: Platform) -> None:
        await self._publisher.unlink_account(profile, platform)
