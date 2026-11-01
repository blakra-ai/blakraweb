from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from blakrasocial.api.dependencies import ContainerDep, ProfileDep
from blakrasocial.api.schemas.accounts import (
    AccountResponse,
    AccountsResponse,
    ConnectUrlResponse,
    TikTokCreatorInfoResponse,
)
from blakrasocial.application.dto import ConnectAccountCommand
from blakrasocial.domain.enums import Platform

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/connect-url", summary="Linking page URL to open in a popup")
async def connect_url(
    profile: ProfileDep,
    container: ContainerDep,
    platform: Platform | None = None,
    redirect_url: Annotated[str | None, Query(alias="redirectUrl", max_length=2048)] = None,
    origin: Annotated[str | None, Query(max_length=255)] = None,
) -> ConnectUrlResponse:
    command = ConnectAccountCommand(platform=platform, redirect_url=redirect_url, origin=origin)
    return ConnectUrlResponse.from_domain(await container.connect_account().execute(profile, command))


@router.get("", summary="Connected networks with account names and avatars")
async def list_accounts(profile: ProfileDep, container: ContainerDep) -> AccountsResponse:
    accounts = await container.list_accounts().execute(profile)
    return AccountsResponse(accounts=[AccountResponse.from_domain(a) for a in accounts])


@router.get(
    "/tiktok/creator-info",
    summary="TikTok account's current posting options (read before each TikTok post, as TikTok requires)",
)
async def tiktok_creator_info(
    profile: ProfileDep, container: ContainerDep, response: Response
) -> TikTokCreatorInfoResponse:
    response.headers["Cache-Control"] = "no-store"
    return TikTokCreatorInfoResponse.from_domain(await container.tiktok_creator_info().execute(profile))


@router.delete("/{platform}", status_code=status.HTTP_204_NO_CONTENT, summary="Disconnect a network")
async def unlink(platform: Platform, profile: ProfileDep, container: ContainerDep) -> Response:
    await container.unlink_account().execute(profile, platform)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
