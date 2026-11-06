from __future__ import annotations

from typing import Protocol

from blakrasocial.application.dto import MediaMetadata


class MediaInspector(Protocol):
    """Measures a stored file (size, dimensions, duration) on the server side."""

    async def inspect(self, url: str, content_type_hint: str | None = None) -> MediaMetadata: ...
