from __future__ import annotations

from collections.abc import Sequence

from blakrasocial.application.dto import DirectMessageResult
from blakrasocial.application.errors import ProviderRejected
from blakrasocial.domain.value_objects import PhoneNumber, ProfileKey
from blakrasocial.infrastructure.ayrshare.client import AyrshareClient


class AyrshareWhatsAppMessenger:
    """`DirectMessenger` over Ayrshare's Messages API (WhatsApp is in private beta there).

    A rejection for one recipient (e.g. outside the 24-hour window) is reported in the
    result instead of failing the whole batch; outages still raise.
    """

    def __init__(self, client: AyrshareClient) -> None:
        self._client = client

    async def send(
        self,
        profile: ProfileKey,
        recipient: PhoneNumber,
        text: str,
        media_urls: Sequence[str],
    ) -> DirectMessageResult:
        payload: dict[str, object] = {"recipientId": recipient.digits}
        if text:
            payload["message"] = text
        if media_urls:
            payload["mediaUrls"] = list(media_urls)
        try:
            body = await self._client.call(
                "POST", "/messages/whatsapp", profile=profile, json=payload, idempotent=False
            )
        except ProviderRejected as exc:
            return DirectMessageResult(recipient=recipient.digits, succeeded=False, error=exc.message)
        return DirectMessageResult(
            recipient=recipient.digits,
            succeeded=True,
            message_id=_message_id(body),
        )


def _message_id(body: object) -> str | None:
    if not isinstance(body, dict):
        return None
    if body.get("messageId"):
        return str(body["messageId"])
    messages = body.get("messages")
    if isinstance(messages, list) and messages and isinstance(messages[0], dict):
        value = messages[0].get("messageId") or messages[0].get("id")
        return str(value) if value else None
    return None
