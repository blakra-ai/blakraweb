from __future__ import annotations

import re
from datetime import timedelta

from blakrasocial.application.dto import SignedUploadTicket, UploadMediaCommand
from blakrasocial.application.errors import MediaRejected
from blakrasocial.application.ports import Clock, MediaReferenceSigner, SocialPublisher
from blakrasocial.domain.value_objects import ProfileKey

# What the provider's presigned upload accepts (Ayrshare: mp4, mov, png, jpg, jpeg).
UPLOADABLE_TYPES: dict[str, frozenset[str]] = {
    "image/jpeg": frozenset({"jpg", "jpeg"}),
    "image/png": frozenset({"png"}),
    "video/mp4": frozenset({"mp4"}),
    "video/quicktime": frozenset({"mov"}),
}
MAX_UPLOAD_BYTES = 5 * 1024**3
# The provider keeps uploaded files for 30 days; keep a safety margin.
MEDIA_LIFETIME = timedelta(days=29)
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


class UploadMedia:
    """Issues a presigned, single-use upload URL so the browser uploads straight to storage."""

    def __init__(self, publisher: SocialPublisher, signer: MediaReferenceSigner, clock: Clock) -> None:
        self._publisher = publisher
        self._signer = signer
        self._clock = clock

    async def execute(self, profile: ProfileKey, command: UploadMediaCommand) -> SignedUploadTicket:
        content_type = command.content_type.lower().strip()
        extension = command.file_name.rsplit(".", 1)[-1].lower() if "." in command.file_name else ""
        allowed = UPLOADABLE_TYPES.get(content_type)
        if allowed is None or extension not in allowed:
            raise MediaRejected(
                f"Only JPG, PNG, MP4 and MOV files can be uploaded (got '{content_type}', '.{extension}').",
                field="contentType",
            )
        if not 0 < command.size_bytes <= MAX_UPLOAD_BYTES:
            raise MediaRejected("File must be between 1 byte and 5 GB.", field="sizeBytes")

        safe_name = _SAFE_NAME.sub("-", command.file_name)[-120:]
        ticket = await self._publisher.upload_media(profile, safe_name, content_type)
        expires_at = self._clock.now() + MEDIA_LIFETIME
        token = self._signer.sign(profile, ticket.access_url, content_type, expires_at)
        return SignedUploadTicket(ticket=ticket, media_token=token, media_expires_at=expires_at)
