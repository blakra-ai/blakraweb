from __future__ import annotations

from fastapi import APIRouter, Depends, status

from blakrasocial.api.dependencies import ContainerDep, require_service_key
from blakrasocial.api.schemas.profiles import CreateProfileRequest, CreateProfileResponse
from blakrasocial.application.dto import CreateProfileCommand

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_service_key)],
    summary="Create a customer profile (server-to-server, host platform only)",
)
async def create_profile(body: CreateProfileRequest, container: ContainerDep) -> CreateProfileResponse:
    profile = await container.create_profile().execute(CreateProfileCommand(title=body.title))
    return CreateProfileResponse(profile_key=profile.value)
