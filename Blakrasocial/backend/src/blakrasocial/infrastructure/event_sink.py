from __future__ import annotations

from blakrasocial.application.dto import PublishEvent
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)


class LoggingPublishEventSink:
    """v1 has no database, so verified publish results are recorded in structured logs."""

    async def handle(self, event: PublishEvent) -> None:
        _log.info(
            "publish_result_received",
            post_id=event.post_id,
            succeeded=event.succeeded,
            action=event.raw_action,
            results=list(event.results),
        )
