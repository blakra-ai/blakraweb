from __future__ import annotations

from typing import Protocol

from blakrasocial.application.dto import PublishEvent


class PublishEventSink(Protocol):
    """Where verified publish results go (log today; a queue or the host platform later)."""

    async def handle(self, event: PublishEvent) -> None: ...
