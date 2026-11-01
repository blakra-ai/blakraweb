from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from blakrasocial.application.dto import DirectMessageResult
from blakrasocial.domain.value_objects import PhoneNumber, ProfileKey


class DirectMessenger(Protocol):
    """Sends one-to-one messages (WhatsApp). Kept apart from `SocialPublisher` (ISP):
    messaging has recipients and a 24-hour window, publishing has neither."""

    async def send(
        self,
        profile: ProfileKey,
        recipient: PhoneNumber,
        text: str,
        media_urls: Sequence[str],
    ) -> DirectMessageResult: ...
