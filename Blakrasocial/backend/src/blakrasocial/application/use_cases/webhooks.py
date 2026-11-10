from __future__ import annotations

from collections.abc import Mapping

from blakrasocial.application.ports import (
    PublishEventSink,
    WebhookEventParser,
    WebhookSignatureVerifier,
)


class HandlePublishWebhook:
    """Verifies the provider's signature first, then parses and forwards the event."""

    def __init__(
        self,
        verifier: WebhookSignatureVerifier,
        parser: WebhookEventParser,
        sink: PublishEventSink,
    ) -> None:
        self._verifier = verifier
        self._parser = parser
        self._sink = sink

    async def execute(self, raw_body: bytes, headers: Mapping[str, str]) -> None:
        self._verifier.verify(raw_body, headers)
        event = self._parser.parse(raw_body)
        if event is not None:
            await self._sink.handle(event)
