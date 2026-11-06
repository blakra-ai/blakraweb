"""Where networks send the browser back after the customer approves (or declines) access."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse, Response

from blakrasocial.api import oauth_pages
from blakrasocial.api.dependencies import ContainerDep
from blakrasocial.application.direct import LinkOutcome
from blakrasocial.application.errors import ApplicationError
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.infrastructure.logging import get_logger

router = APIRouter(prefix="/oauth", tags=["oauth"], include_in_schema=False)
_log = get_logger(__name__)


@router.get("/{platform}/callback")
async def callback(
    platform: Platform,
    container: ContainerDep,
    code: Annotated[str | None, Query(max_length=2048)] = None,
    state: Annotated[str | None, Query(max_length=512)] = None,
    error: Annotated[str | None, Query(max_length=200)] = None,
    error_description: Annotated[str | None, Query(max_length=500)] = None,
) -> Response:
    if error or not code or not state:
        declined = error in ("access_denied", "user_denied", "user_cancelled")
        message = "Access was not approved." if declined else (error_description or error or "Missing code.")
        return oauth_pages.failed(platform, message)
    try:
        outcome = await container.require_direct().linker.complete(platform, code, state)
    except (ApplicationError, InvalidValue) as exc:
        _log.warning("oauth_callback_failed", platform=platform.value, error=type(exc).__name__)
        return oauth_pages.failed(platform, getattr(exc, "message", "Could not connect the account."))
    return _render(outcome)


@router.post("/{platform}/select")
async def select(
    platform: Platform,
    container: ContainerDep,
    token: Annotated[str, Form(max_length=512)],
    account_id: Annotated[str, Form(max_length=255)],
) -> Response:
    try:
        outcome = await container.require_direct().linker.choose(platform, token, account_id)
    except (ApplicationError, InvalidValue) as exc:
        return oauth_pages.failed(platform, getattr(exc, "message", "Could not connect the account."))
    return _render(outcome)


def _render(outcome: LinkOutcome) -> Response:
    if outcome.connected is None:
        assert outcome.selection_token is not None
        return oauth_pages.choose(
            outcome.platform, outcome.selection_token, outcome.choices, f"/oauth/{outcome.platform.value}/select"
        )
    if outcome.redirect_url:  # validated against allowed origins when the flow started
        return RedirectResponse(outcome.redirect_url, status_code=303)
    page: HTMLResponse = oauth_pages.connected(outcome.platform, outcome.connected)
    return page
