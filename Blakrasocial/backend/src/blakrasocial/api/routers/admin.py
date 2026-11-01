"""Admin panel API: customers and their set-password links, WhatsApp numbers. Admin tokens only."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from blakrasocial.api.dependencies import CallerDep, ContainerDep
from blakrasocial.api.routers.auth import Csrf
from blakrasocial.api.schemas.auth import (
    AdminUserOut,
    AdminUsersResponse,
    CreateUserRequest,
    InviteLinkResponse,
    WhatsAppNumberRequest,
)
from blakrasocial.application.accounts.service import InviteLink
from blakrasocial.application.dto import CallerIdentity
from blakrasocial.application.errors import Forbidden, NotFound
from blakrasocial.application.use_cases.whatsapp_setup import WhatsAppSetupCommand
from blakrasocial.container import Container
from blakrasocial.infrastructure.accounts.tokens import ADMIN_SCOPE


async def require_admin(caller: CallerDep) -> CallerIdentity:
    if ADMIN_SCOPE not in caller.scopes:
        raise Forbidden("Admins only.")
    return caller


AdminDep = Annotated[CallerIdentity, Depends(require_admin)]
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _link(container: Container, invite: InviteLink) -> InviteLinkResponse:
    # The token goes in the URL fragment: browsers never send fragments to servers or in Referer.
    return InviteLinkResponse(
        user=AdminUserOut.from_domain(invite.user),
        link=f"{container.settings.app_base}/invite#{invite.token}",
        expires_in=invite.expires_in_seconds,
    )


@router.get("/users", summary="All accounts")
async def list_users(container: ContainerDep, response: Response) -> AdminUsersResponse:
    response.headers["Cache-Control"] = "no-store"
    return AdminUsersResponse(users=[AdminUserOut.from_domain(u) for u in await container.manage_customers().list()])


@router.post("/users", status_code=status.HTTP_201_CREATED, dependencies=[Csrf], summary="Create an account + link")
async def create_user(body: CreateUserRequest, container: ContainerDep) -> InviteLinkResponse:
    return _link(container, await container.manage_customers().create(body.email, body.title, body.role))


@router.post("/users/{user_id}/link", dependencies=[Csrf], summary="New set-password link (invite or reset)")
async def new_link(user_id: str, container: ContainerDep) -> InviteLinkResponse:
    return _link(container, await container.manage_customers().new_link(user_id))


@router.post("/users/{user_id}/disable", dependencies=[Csrf], summary="Block sign-in and end sessions")
async def disable(user_id: str, admin: AdminDep, container: ContainerDep) -> AdminUserOut:
    return AdminUserOut.from_domain(await container.manage_customers().set_disabled(admin.subject, user_id, True))


@router.post("/users/{user_id}/enable", dependencies=[Csrf], summary="Allow sign-in again")
async def enable(user_id: str, admin: AdminDep, container: ContainerDep) -> AdminUserOut:
    return AdminUserOut.from_domain(await container.manage_customers().set_disabled(admin.subject, user_id, False))


@router.put(
    "/users/{user_id}/whatsapp",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Csrf],
    summary="Attach a WhatsApp Business number (Cloud API) to this account",
)
async def set_whatsapp(user_id: str, body: WhatsAppNumberRequest, container: ContainerDep) -> Response:
    user = await container.require_accounts().users.by_id(user_id)
    if user is None:
        raise NotFound("Unknown user.")
    await container.setup_whatsapp().execute(
        WhatsAppSetupCommand(
            profile=user.profile_key,
            phone_number_id=body.phone_number_id,
            access_token=body.access_token.get_secret_value(),
            display_name=body.display_name,
            phone_display=body.phone_display,
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
