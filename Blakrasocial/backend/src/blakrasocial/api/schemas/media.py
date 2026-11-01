from __future__ import annotations

from datetime import datetime

from pydantic import Field

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.application.dto import SignedUploadTicket


class UploadUrlRequest(CamelModel):
    file_name: str = Field(min_length=3, max_length=255)
    content_type: str = Field(min_length=3, max_length=100)
    size_bytes: int = Field(gt=0)


class UploadUrlResponse(CamelModel):
    upload_url: str
    access_url: str
    content_type: str
    upload_expires_at: datetime | None
    media_token: str
    media_expires_at: datetime

    @classmethod
    def from_domain(cls, value: SignedUploadTicket) -> UploadUrlResponse:
        return cls(
            upload_url=value.ticket.upload_url,
            access_url=value.ticket.access_url,
            content_type=value.ticket.content_type,
            upload_expires_at=value.ticket.expires_at,
            media_token=value.media_token,
            media_expires_at=value.media_expires_at,
        )
