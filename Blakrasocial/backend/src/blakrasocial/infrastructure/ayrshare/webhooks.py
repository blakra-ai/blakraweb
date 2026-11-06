from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Mapping

from blakrasocial.application.dto import PublishEvent
from blakrasocial.application.errors import InvalidSignature

_SIG_V2 = "x-authorization-content-sha256-v2"
_SIG_V1 = "x-authorization-content-sha256"
_TIMESTAMP = "x-authorization-timestamp"


class AyrshareWebhookVerifier:
    """HMAC-SHA256 over the raw body (Ayrshare webhook security). Fails closed."""

    def __init__(self, secret: str | None, max_age_seconds: int = 300, clock=time.time) -> None:  # type: ignore[no-untyped-def]
        self._secret = secret.encode() if secret else None
        self._max_age = max_age_seconds
        self._clock = clock

    def verify(self, raw_body: bytes, headers: Mapping[str, str]) -> None:
        if self._secret is None:
            raise InvalidSignature("Webhooks are disabled: no signing secret configured.")
        lowered = {k.lower(): v for k, v in headers.items()}

        timestamp = lowered.get(_TIMESTAMP, "")
        if not timestamp.isdigit() or abs(self._clock() - int(timestamp)) > self._max_age:
            raise InvalidSignature("Webhook timestamp missing or outside the allowed window.")

        expected = hmac.new(self._secret, raw_body, hashlib.sha256).hexdigest()
        candidates = [part.strip().removeprefix("v1=") for part in lowered.get(_SIG_V2, "").split(",") if part.strip()]
        if not candidates and lowered.get(_SIG_V1):
            candidates = [lowered[_SIG_V1].strip()]
        if not any(hmac.compare_digest(expected, c.lower()) for c in candidates):
            raise InvalidSignature("Webhook signature does not match.")


class AyrshareWebhookParser:
    def parse(self, raw_body: bytes) -> PublishEvent | None:
        try:
            body = json.loads(raw_body)
        except ValueError:
            return None
        if not isinstance(body, dict) or body.get("action") != "scheduled":
            return None
        results = tuple(
            {
                "platform": str(item.get("platform")),
                "status": str(item.get("status")),
                "postUrl": item.get("postUrl"),
            }
            for item in body.get("postIds") or []
            if isinstance(item, dict)
        )
        return PublishEvent(
            post_id=str(body.get("id", "")),
            succeeded=body.get("status") == "success",
            results=results,
            raw_action=str(body.get("subAction") or body.get("action")),
        )
