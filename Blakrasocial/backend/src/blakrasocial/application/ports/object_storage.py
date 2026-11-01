from __future__ import annotations

from typing import Protocol

from blakrasocial.domain.entities import MediaUploadTicket


class ObjectStorage(Protocol):
    """S3-compatible bucket whose objects are publicly readable by the networks."""

    async def presign_upload(self, key: str, content_type: str, size_bytes: int) -> MediaUploadTicket: ...

    def public_url(self, key: str) -> str: ...

    async def delete(self, key: str) -> None: ...
