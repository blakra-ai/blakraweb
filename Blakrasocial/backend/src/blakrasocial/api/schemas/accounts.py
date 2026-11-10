from __future__ import annotations

from datetime import datetime

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.domain.entities import ConnectedAccount, ConnectUrl, TikTokCreatorInfo
from blakrasocial.domain.enums import Platform, TikTokVisibility


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


class TikTokCreatorInfoResponse(CamelModel):
    """Shown above the TikTok options; the composer may offer only these choices (TikTok UX rules)."""

    nickname: str
    username: str | None
    avatar_url: str | None
    privacy_levels: list[TikTokVisibility]
    comment_disabled: bool
    duet_disabled: bool
    stitch_disabled: bool
    max_video_seconds: int | None
    can_post: bool
    reason: str | None

    @classmethod
    def from_domain(cls, info: TikTokCreatorInfo) -> TikTokCreatorInfoResponse:
        return cls(
            nickname=info.nickname,
            username=info.username,
            avatar_url=info.avatar_url,
            privacy_levels=list(info.privacy_levels),
            comment_disabled=info.comment_disabled,
            duet_disabled=info.duet_disabled,
            stitch_disabled=info.stitch_disabled,
            max_video_seconds=info.max_video_seconds,
            can_post=info.can_post,
            reason=info.reason,
        )
