"""JSON shapes for values stored in the database (options, media, credentials)."""

from __future__ import annotations

import dataclasses
from datetime import datetime
from enum import Enum
from typing import Any

from blakrasocial.domain.entities import (
    ConnectedAccount,
    FacebookOptions,
    InstagramOptions,
    LinkedInOptions,
    MediaAsset,
    OAuthCredential,
    PlatformOptions,
    TikTokOptions,
    WhatsAppOptions,
)
from blakrasocial.domain.enums import LinkedInVisibility, MediaKind, Platform, TikTokVisibility
from blakrasocial.domain.value_objects import MediaUrl, PhoneNumber

_OPTIONS_TYPE: dict[Platform, type[PlatformOptions]] = {
    Platform.INSTAGRAM: InstagramOptions,
    Platform.FACEBOOK: FacebookOptions,
    Platform.TIKTOK: TikTokOptions,
    Platform.LINKEDIN: LinkedInOptions,
    Platform.WHATSAPP: WhatsAppOptions,
}


def _plain(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, PhoneNumber):
        return value.digits
    if isinstance(value, tuple | list):
        return [_plain(v) for v in value]
    return value


def dump_options(options: PlatformOptions) -> dict[str, Any]:
    if type(options) is PlatformOptions:
        return {}
    return {f.name: _plain(getattr(options, f.name)) for f in dataclasses.fields(options)}


def load_options(platform: Platform, data: dict[str, Any]) -> PlatformOptions:
    cls = _OPTIONS_TYPE[platform]
    if not data:
        return cls()
    values = dict(data)
    if cls is TikTokOptions and values.get("visibility") is not None:
        values["visibility"] = TikTokVisibility(values["visibility"])
    if cls is LinkedInOptions and "visibility" in values:
        values["visibility"] = LinkedInVisibility(values["visibility"])
    if cls is InstagramOptions and "collaborators" in values:
        values["collaborators"] = tuple(values["collaborators"])
    if cls is WhatsAppOptions and "recipients" in values:
        values["recipients"] = tuple(PhoneNumber(d) for d in values["recipients"])
    known = {f.name for f in dataclasses.fields(cls)}
    return cls(**{k: v for k, v in values.items() if k in known})


def dump_media(media: tuple[MediaAsset, ...]) -> list[dict[str, Any]]:
    return [
        {
            "url": m.url.value,
            "kind": m.kind.value,
            "mimeType": m.mime_type,
            "sizeBytes": m.size_bytes,
            "width": m.width,
            "height": m.height,
            "durationSeconds": m.duration_seconds,
        }
        for m in media
    ]


def load_media(data: list[dict[str, Any]]) -> tuple[MediaAsset, ...]:
    return tuple(
        MediaAsset(
            url=MediaUrl(m["url"]),
            kind=MediaKind(m["kind"]),
            mime_type=m["mimeType"],
            size_bytes=m["sizeBytes"],
            width=m.get("width"),
            height=m.get("height"),
            duration_seconds=m.get("durationSeconds"),
        )
        for m in data
    )


def dump_account(account: ConnectedAccount) -> dict[str, Any]:
    return {
        "displayName": account.display_name,
        "username": account.username,
        "avatarUrl": account.avatar_url,
        "profileUrl": account.profile_url,
        "accountType": account.account_type,
    }


def load_account(platform: Platform, data: dict[str, Any]) -> ConnectedAccount:
    return ConnectedAccount(
        platform=platform,
        display_name=data.get("displayName") or platform.value.title(),
        username=data.get("username"),
        avatar_url=data.get("avatarUrl"),
        profile_url=data.get("profileUrl"),
        account_type=data.get("accountType"),
    )


def dump_credential(c: OAuthCredential) -> dict[str, Any]:
    """Full credential, tokens included: only ever stored encrypted."""
    return {
        "platform": c.platform.value,
        "accountId": c.account_id,
        "account": dump_account(c.account),
        "accessToken": c.access_token,
        "refreshToken": c.refresh_token,
        "expiresAt": c.expires_at.isoformat() if c.expires_at else None,
        "refreshExpiresAt": c.refresh_expires_at.isoformat() if c.refresh_expires_at else None,
        "scopes": list(c.scopes),
        "extra": dict(c.extra),
    }


def load_credential(data: dict[str, Any]) -> OAuthCredential:
    platform = Platform(data["platform"])
    return OAuthCredential(
        platform=platform,
        account_id=data["accountId"],
        account=load_account(platform, data["account"]),
        access_token=data["accessToken"],
        refresh_token=data.get("refreshToken"),
        expires_at=datetime.fromisoformat(data["expiresAt"]) if data.get("expiresAt") else None,
        refresh_expires_at=datetime.fromisoformat(data["refreshExpiresAt"]) if data.get("refreshExpiresAt") else None,
        scopes=tuple(data.get("scopes") or ()),
        extra=dict(data.get("extra") or {}),
    )
