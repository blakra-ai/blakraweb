from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from blakrasocial.api.dependencies import ContainerDep, require_service_key
from blakrasocial.api.schemas.profiles import CreateProfileRequest, CreateProfileResponse, WhatsAppSetupRequest
from blakrasocial.application.dto import CreateProfileCommand
from blakrasocial.application.use_cases.whatsapp_setup import WhatsAppSetupCommand
from blakrasocial.domain.value_objects import ProfileKey

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


@router.put(
    "/whatsapp",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_service_key)],
    summary="Attach a WhatsApp Business number to a profile (server-to-server, direct mode)",
)
async def setup_whatsapp(body: WhatsAppSetupRequest, container: ContainerDep) -> Response:
    await container.setup_whatsapp().execute(
        WhatsAppSetupCommand(
            profile=ProfileKey(body.profile_key),
            phone_number_id=body.phone_number_id,
            access_token=body.access_token.get_secret_value(),
            display_name=body.display_name,
            phone_display=body.phone_display,
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
