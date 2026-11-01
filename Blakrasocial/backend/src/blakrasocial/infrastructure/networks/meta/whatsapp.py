"""WhatsApp Cloud API messenger. The business number is set up by an admin per profile."""

from __future__ import annotations

from collections.abc import Sequence

from blakrasocial.application.dto import DirectMessageResult
from blakrasocial.application.errors import ApplicationError
from blakrasocial.application.ports.repositories import CredentialRepository, profile_id_of
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import PhoneNumber, ProfileKey
from blakrasocial.infrastructure.networks.http import NetworkApi

GRAPH = "https://graph.facebook.com"
_OUTSIDE_WINDOW = 131047
_KIND_BY_EXTENSION = {"jpg": "image", "jpeg": "image", "png": "image", "mp4": "video", "mov": "video"}


class CloudApiMessenger:
    """`DirectMessenger` over WhatsApp Cloud API. Free-form messages reach a contact only inside
    the 24-hour customer-service window (they wrote to you in the last 24 hours)."""

    def __init__(self, api: NetworkApi, credentials: CredentialRepository, version: str) -> None:
        self._api = api
        self._credentials = credentials
        self._base = f"{GRAPH}/{version}"

    async def send(
        self, profile: ProfileKey, recipient: PhoneNumber, text: str, media_urls: Sequence[str]
    ) -> DirectMessageResult:
        credential = await self._credentials.get(profile_id_of(profile), Platform.WHATSAPP)
        if credential is None:
            return DirectMessageResult(recipient.digits, False, error="WhatsApp isn't set up for this account yet.")
        messages = _messages(recipient.digits, text, media_urls)
        last_id: str | None = None
        try:
            for message in messages:
                sent = await self._api.call(
                    "POST",
                    f"{self._base}/{credential.account_id}/messages",
                    headers={"Authorization": f"Bearer {credential.access_token}"},
                    json=message,
                    idempotent=False,
                )
                last_id = str((sent.body.get("messages") or [{}])[0].get("id") or "") or None
        except ApplicationError as exc:
            code = getattr(exc, "provider_code", None)
            if code == _OUTSIDE_WINDOW:
                return DirectMessageResult(
                    recipient.digits, False, error="This contact hasn't messaged you in the last 24 hours."
                )
            return DirectMessageResult(recipient.digits, False, error=exc.message)
        return DirectMessageResult(recipient.digits, True, message_id=last_id)


def _messages(to: str, text: str, media_urls: Sequence[str]) -> list[dict[str, object]]:
    base = {"messaging_product": "whatsapp", "recipient_type": "individual", "to": to}
    if not media_urls:
        return [{**base, "type": "text", "text": {"body": text, "preview_url": True}}]
    messages: list[dict[str, object]] = []
    for index, url in enumerate(media_urls):
        kind = _KIND_BY_EXTENSION.get(url.split("?", 1)[0].rsplit(".", 1)[-1].lower(), "document")
        payload: dict[str, str] = {"link": url}
        if index == 0 and text and kind != "document":
            payload["caption"] = text
        messages.append({**base, "type": kind, kind: payload})
    if text and _KIND_BY_EXTENSION.get(media_urls[0].split("?", 1)[0].rsplit(".", 1)[-1].lower()) is None:
        messages.insert(0, {**base, "type": "text", "text": {"body": text, "preview_url": True}})
    return messages
