"""Meta's `signed_request` (deauthorize and data-deletion callbacks): base64url(sig).base64url(payload),
where sig = HMAC-SHA256(payload part, app secret). See developers.facebook.com/docs/development/
create-an-app/app-dashboard/data-deletion-callback."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
from typing import Any

from blakrasocial.application.errors import Unauthorized


def _b64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class SignedRequestVerifier:
    def __init__(self, app_secret: str) -> None:
        self._secret = app_secret.encode()

    def user_id(self, signed_request: str) -> str:
        """Returns the network user id after checking the signature; raises `Unauthorized` otherwise."""
        try:
            encoded_sig, payload = signed_request.split(".", 1)
            signature = _b64url(encoded_sig)
            data: dict[str, Any] = json.loads(_b64url(payload))
        except (ValueError, binascii.Error, json.JSONDecodeError) as exc:
            raise Unauthorized("Malformed signed_request.") from exc
        expected = hmac.new(self._secret, payload.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected):
            raise Unauthorized("Invalid signed_request signature.")
        if str(data.get("algorithm", "")).upper() != "HMAC-SHA256" or not data.get("user_id"):
            raise Unauthorized("Unsupported signed_request.")
        return str(data["user_id"])
