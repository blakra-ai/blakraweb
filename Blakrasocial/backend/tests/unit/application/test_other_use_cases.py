from __future__ import annotations

import pytest

from blakrasocial.application.dto import ConnectAccountCommand, UploadMediaCommand
from blakrasocial.application.errors import MediaRejected
from blakrasocial.application.use_cases import ConnectAccount, ListAccounts, UploadMedia
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.errors import InvalidValue
from tests.fakes import account


async def test_upload_media_signs_access_url(publisher, signer, clock, profile) -> None:  # type: ignore[no-untyped-def]
    ticket = await UploadMedia(publisher, signer, clock).execute(
        profile, UploadMediaCommand("My Clip (1).mp4", "video/mp4", 1024)
    )
    assert ticket.ticket.access_url.endswith("My-Clip-1-.mp4")
    verified = signer.verify(profile, ticket.ticket.access_url, ticket.media_token)
    assert verified.content_type == "video/mp4"


@pytest.mark.parametrize(
    ("name", "content_type", "size"),
    [("a.exe", "application/octet-stream", 10), ("a.png", "video/mp4", 10), ("a.mp4", "video/mp4", 0)],
)
async def test_upload_media_rejects_bad_files(publisher, signer, clock, profile, name, content_type, size) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(MediaRejected):
        await UploadMedia(publisher, signer, clock).execute(profile, UploadMediaCommand(name, content_type, size))


async def test_connect_account_only_allows_known_origins(publisher, profile) -> None:  # type: ignore[no-untyped-def]
    use_case = ConnectAccount(publisher, frozenset({"https://app.blakra.com"}))
    ok = await use_case.execute(profile, ConnectAccountCommand(redirect_url="https://app.blakra.com/done"))
    assert ok.url.startswith("https://")
    with pytest.raises(InvalidValue):
        await use_case.execute(profile, ConnectAccountCommand(redirect_url="https://evil.example/phish"))


async def test_list_accounts_is_sorted_by_platform_order(publisher, profile) -> None:  # type: ignore[no-untyped-def]
    publisher.accounts = [account(Platform.WHATSAPP), account(Platform.INSTAGRAM)]
    accounts = await ListAccounts(publisher).execute(profile)
    assert [a.platform for a in accounts] == [Platform.INSTAGRAM, Platform.WHATSAPP]
