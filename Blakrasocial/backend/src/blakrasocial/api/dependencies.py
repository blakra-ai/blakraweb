from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import Depends, Header, Request

from blakrasocial.application.dto import CallerIdentity
from blakrasocial.application.errors import Forbidden, Unauthorized
from blakrasocial.container import Container
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import IdempotencyKey, ProfileKey


def get_container(request: Request) -> Container:
    return request.app.state.container  # type: ignore[no-any-return]


ContainerDep = Annotated[Container, Depends(get_container)]


async def get_caller(
    container: ContainerDep,
    authorization: Annotated[str | None, Header()] = None,
) -> CallerIdentity:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise Unauthorized("Missing bearer token.")
    return await container.authenticator.authenticate(token.strip())


CallerDep = Annotated[CallerIdentity, Depends(get_caller)]


async def get_profile_key(
    caller: CallerDep,
    x_profile_key: Annotated[str | None, Header(alias="X-Profile-Key")] = None,
) -> ProfileKey:
    """The header must match the profile key inside the signed token (no tenant hopping)."""
    if not x_profile_key:
        raise Unauthorized("Missing X-Profile-Key header.")
    if caller.profile_key is None or not hmac.compare_digest(x_profile_key.encode(), caller.profile_key.value.encode()):
        raise Forbidden("X-Profile-Key does not belong to this user.")
    return caller.profile_key


ProfileDep = Annotated[ProfileKey, Depends(get_profile_key)]


async def require_service_key(
    container: ContainerDep,
    x_service_key: Annotated[str | None, Header(alias="X-Service-Key")] = None,
) -> None:
    container.service_keys.verify(x_service_key)


async def get_idempotency_key(
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> IdempotencyKey:
    if not idempotency_key:
        raise InvalidValue("Idempotency-Key", "header is required for publishing")
    return IdempotencyKey(idempotency_key)


IdempotencyDep = Annotated[IdempotencyKey, Depends(get_idempotency_key)]
