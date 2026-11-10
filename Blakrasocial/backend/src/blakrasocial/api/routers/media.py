from __future__ import annotations

from fastapi import APIRouter

from blakrasocial.api.dependencies import ContainerDep, ProfileDep
from blakrasocial.api.schemas.media import UploadUrlRequest, UploadUrlResponse
from blakrasocial.application.dto import UploadMediaCommand

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload-url", summary="Presigned single-use upload URL + signed media reference")
async def upload_url(body: UploadUrlRequest, profile: ProfileDep, container: ContainerDep) -> UploadUrlResponse:
    command = UploadMediaCommand(body.file_name, body.content_type, body.size_bytes)
    return UploadUrlResponse.from_domain(await container.upload_media().execute(profile, command))
