"""Doubles for direct-mode ports (OAuth providers, connectors, storage, signal)."""

from __future__ import annotations

import base64
import os
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from blakrasocial.application.ports.platform_connector import ConnectorResult
from blakrasocial.domain.entities import ConnectedAccount, MediaAsset, MediaUploadTicket, OAuthCredential, PostTarget
from blakrasocial.domain.enums import Platform

TEST_KEY = ("k1", os.urandom(32))


def credential(platform: Platform, account_id: str = "acct-1", **kw: object) -> OAuthCredential:
    return OAuthCredential(
        platform=platform,
        account_id=account_id,
        account=ConnectedAccount(platform, f"Blakra {platform.value}", "blakra", account_type="business"),
        access_token=f"token-{platform.value}-{account_id}",
        **kw,  # type: ignore[arg-type]
    )


@dataclass
class FakeProvider:
    platform: Platform
    uses_pkce: bool = True
    results: list[OAuthCredential] = field(default_factory=list)
    exchanged: list[tuple[str, str, str | None]] = field(default_factory=list)
    refresh_ahead: timedelta | None = timedelta(days=7)
    refresh_error: Exception | None = None

    def authorization_url(self, *, state: str, redirect_uri: str, code_challenge: str | None) -> str:
        query = {"state": state, "redirect_uri": redirect_uri}
        if code_challenge:
            query["code_challenge"] = code_challenge
        return f"https://auth.{self.platform.value}.test/authorize?{urlencode(query)}"

    async def exchange_code(self, *, code: str, redirect_uri: str, code_verifier: str | None) -> list[OAuthCredential]:
        self.exchanged.append((code, redirect_uri, code_verifier))
        return list(self.results) or [credential(self.platform)]

    async def refresh(self, credential: OAuthCredential) -> OAuthCredential:
        if self.refresh_error:
            raise self.refresh_error
        from dataclasses import replace

        return replace(
            credential,
            access_token=credential.access_token + "-refreshed",
            expires_at=datetime.now(UTC) + timedelta(days=60),
        )


@dataclass
class FakeConnector:
    can_delete: bool = True
    script: list[ConnectorResult | Exception] = field(default_factory=list)
    calls: list[tuple[str, str]] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)

    def _next(self, default: ConnectorResult) -> ConnectorResult:
        if not self.script:
            return default
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    async def publish(
        self, credential: OAuthCredential, caption: str, target: PostTarget, media: Sequence[MediaAsset]
    ) -> ConnectorResult:
        self.calls.append(("publish", caption))
        return self._next(ConnectorResult.published("remote-1", "https://network.test/p/remote-1"))

    async def poll(self, credential: OAuthCredential, handle: str) -> ConnectorResult:
        self.calls.append(("poll", handle))
        return self._next(ConnectorResult.published("remote-1", "https://network.test/p/remote-1"))

    async def delete(self, credential: OAuthCredential, remote_id: str) -> None:
        self.deleted.append(remote_id)


class FakeStorage:
    async def presign_upload(self, key: str, content_type: str, size_bytes: int) -> MediaUploadTicket:
        return MediaUploadTicket(f"https://upload.test/{key}?sig=1", self.public_url(key), content_type, None)

    def public_url(self, key: str) -> str:
        return f"https://cdn.test/{key}"

    async def delete(self, key: str) -> None:
        return None


@dataclass
class CountingSignal:
    count: int = 0

    def notify(self) -> None:
        self.count += 1


def b64key() -> str:
    return f"{TEST_KEY[0]}:{base64.b64encode(TEST_KEY[1]).decode()}"
