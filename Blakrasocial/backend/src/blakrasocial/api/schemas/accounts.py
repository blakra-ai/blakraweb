from __future__ import annotations

from datetime import datetime

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.domain.entities import ConnectedAccount, ConnectUrl
from blakrasocial.domain.enums import Platform


class ConnectUrlResponse(CamelModel):
    url: str
    expires_at: datetime | None

    @classmethod
    def from_domain(cls, value: ConnectUrl) -> ConnectUrlResponse:
        return cls(url=value.url, expires_at=value.expires_at)


class AccountResponse(CamelModel):
    platform: Platform
    display_name: str
    username: str | None
    avatar_url: str | None
    profile_url: str | None
    account_type: str | None
    needs_reconnect: bool

    @classmethod
    def from_domain(cls, account: ConnectedAccount) -> AccountResponse:
        return cls(
            platform=account.platform,
            display_name=account.display_name,
            username=account.username,
            avatar_url=account.avatar_url,
            profile_url=account.profile_url,
            account_type=account.account_type,
            needs_reconnect=account.needs_reconnect,
        )


class AccountsResponse(CamelModel):
    accounts: list[AccountResponse]
