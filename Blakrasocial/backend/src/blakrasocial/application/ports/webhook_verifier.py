from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from blakrasocial.application.dto import PublishEvent


class WebhookSignatureVerifier(Protocol):
    def verify(self, raw_body: bytes, headers: Mapping[str, str]) -> None:
        """Raise `InvalidSignature` unless the body was signed by the provider."""
        ...


class WebhookEventParser(Protocol):
    def parse(self, raw_body: bytes) -> PublishEvent | None:
        """Translate a provider payload; None for events we don't care about."""
        ...
