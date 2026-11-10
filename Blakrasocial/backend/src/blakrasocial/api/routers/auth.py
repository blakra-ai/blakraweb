"""Built-in sign-in. The refresh token lives only in an HttpOnly, SameSite=Strict cookie; the short
access token is kept in memory by the web app. Cookie endpoints also require a custom header, which
browsers can't send cross-site without a CORS preflight (CSRF protection)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response, status

from blakrasocial.api.dependencies import CallerDep, ContainerDep
from blakrasocial.api.schemas.auth import (
    ChangePasswordRequest,
    InviteInfo,
    LoginRequest,
    SessionResponse,
    SetPasswordRequest,
    UserOut,
)
from blakrasocial.application.accounts.service import SignedIn
from blakrasocial.application.errors import Forbidden
from blakrasocial.container import Container

router = APIRouter(prefix="/auth", tags=["auth"])

CSRF_HEADER = "X-Requested-With"
CSRF_VALUE = "blakrasocial"


async def require_csrf_header(x_requested_with: Annotated[str | None, Header(alias=CSRF_HEADER)] = None) -> None:
    if x_requested_with != CSRF_VALUE:
        raise Forbidden(f"Missing {CSRF_HEADER} header.")


Csrf = Depends(require_csrf_header)


def cookie_name(container: Container) -> str:
    # "__Host-" makes browsers refuse the cookie unless it is Secure, host-only and Path=/.
    return "__Host-bs_session" if _secure(container) else "bs_session"


def _secure(container: Container) -> bool:
    return container.settings.app_base.startswith("https://")


def _respond(container: Container, response: Response, signed: SignedIn) -> SessionResponse:
    response.set_cookie(
        cookie_name(container),
        signed.refresh_token,
        max_age=signed.refresh_expires_in_seconds,
        path="/",
        secure=_secure(container),
        httponly=True,
        samesite="strict",
    )
    response.headers["Cache-Control"] = "no-store"
    return SessionResponse(
        access_token=signed.access.token,
        expires_in=signed.access.expires_in_seconds,
        user=UserOut.from_domain(signed.user),
    )


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login", dependencies=[Csrf], summary="Sign in with email and password")
async def login(body: LoginRequest, request: Request, response: Response, container: ContainerDep) -> SessionResponse:
    signed = await container.sign_in().execute(body.email, body.password.get_secret_value(), _client_ip(request))
    return _respond(container, response, signed)


@router.post("/refresh", dependencies=[Csrf], summary="New access token from the session cookie")
async def refresh(request: Request, response: Response, container: ContainerDep) -> SessionResponse:
    signed = await container.refresh_access().execute(request.cookies.get(cookie_name(container)))
    return _respond(container, response, signed)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Csrf], summary="Sign out")
async def logout(request: Request, container: ContainerDep) -> Response:
    await container.sign_out().execute(request.cookies.get(cookie_name(container)))
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        cookie_name(container), path="/", secure=_secure(container), httponly=True, samesite="strict"
    )
    return response


@router.get("/me", summary="The signed-in user")
async def me(caller: CallerDep, container: ContainerDep) -> UserOut:
    return UserOut.from_domain(await container.current_user().execute(caller.subject))


@router.post("/password", dependencies=[Csrf], summary="Change password (signs out other devices)")
async def change_password(
    body: ChangePasswordRequest, caller: CallerDep, response: Response, container: ContainerDep
) -> SessionResponse:
    signed = await container.change_password().execute(
        caller.subject, body.current_password.get_secret_value(), body.new_password.get_secret_value()
    )
    return _respond(container, response, signed)


@router.get("/invites/{token}", summary="Who a set-password link is for")
async def inspect_invite(token: str, container: ContainerDep, response: Response) -> InviteInfo:
    response.headers["Cache-Control"] = "no-store"
    user = await container.inspect_invite().execute(token)
    return InviteInfo(email=user.email, title=user.title, password_set=user.password_hash is not None)


@router.post("/invites/{token}", dependencies=[Csrf], summary="Set a password from an invite or reset link")
async def accept_invite(
    token: str, body: SetPasswordRequest, response: Response, container: ContainerDep
) -> SessionResponse:
    signed = await container.accept_invite().execute(token, body.password.get_secret_value())
    return _respond(container, response, signed)
