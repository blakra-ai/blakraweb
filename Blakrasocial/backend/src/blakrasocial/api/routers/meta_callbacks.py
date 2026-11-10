"""Callbacks Meta calls when a user removes our app or asks for their data to be deleted.

Register in the Meta app dashboard (Facebook Login for Business settings and Instagram business
login settings): Deauthorize callback URL and Data deletion request URL, see the setup guide.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Form
from fastapi.responses import HTMLResponse

from blakrasocial.api import oauth_pages
from blakrasocial.api.dependencies import ContainerDep
from blakrasocial.domain.enums import Platform

router = APIRouter(prefix="/meta", tags=["meta-callbacks"])

MetaNetwork = Literal["facebook", "instagram"]
SignedRequest = Annotated[str, Form(max_length=4096)]


@router.post("/{network}/deauthorize", summary="Meta: the user removed our app")
async def deauthorize(network: MetaNetwork, signed_request: SignedRequest, container: ContainerDep) -> dict[str, bool]:
    platform = Platform(network)
    subject = container.meta_signed_requests(platform).user_id(signed_request)
    await container.forget_network_user().execute(platform, subject)
    return {"success": True}


@router.post("/{network}/data-deletion", summary="Meta: the user asked us to delete their data")
async def data_deletion(network: MetaNetwork, signed_request: SignedRequest, container: ContainerDep) -> dict[str, str]:
    platform = Platform(network)
    subject = container.meta_signed_requests(platform).user_id(signed_request)
    receipt = await container.forget_network_user().execute(platform, subject)
    # Meta expects exactly these snake_case keys.
    return {
        "url": f"{container.settings.oauth_callback_base}/meta/deletion/{receipt.code}",
        "confirmation_code": receipt.code,
    }


@router.get("/deletion/{code}", include_in_schema=False)
async def deletion_status(code: str, container: ContainerDep) -> HTMLResponse:
    receipt = await container.deletion_receipt().execute(code)
    return oauth_pages.deletion_status(
        receipt.platform, receipt.code, receipt.removed, receipt.requested_at.strftime("%Y-%m-%d %H:%M UTC")
    )
