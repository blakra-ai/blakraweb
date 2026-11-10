from __future__ import annotations

import base64
import hashlib
import hmac
from collections.abc import Callable
from datetime import UTC, datetime

from blakrasocial.application.errors import MediaRejected
from blakrasocial.application.ports.media_signer import VerifiedMedia
from blakrasocial.domain.value_objects import ProfileKey


class HmacMediaSigner:
    """Token = "<expiry>.<content-type b64>.<HMAC-SHA256(profile|url|type|expiry)>"."""

    def __init__(self, secret: str, now: Callable[[], datetime] = lambda: datetime.now(UTC)) -> None:
        self._secret = secret.encode()
        self._now = now

    def sign(self, profile: ProfileKey, url: str, content_type: str, expires_at: datetime) -> str:
        expiry = int(expires_at.timestamp())
        encoded_type = _b64(content_type.encode())
        return f"{expiry}.{encoded_type}.{self._mac(profile, url, content_type, expiry)}"

    def verify(self, profile: ProfileKey, url: str, token: str) -> VerifiedMedia:
        try:
            expiry_text, encoded_type, signature = token.split(".")
            expiry = int(expiry_text)
            content_type = _unb64(encoded_type).decode()
        except (ValueError, UnicodeDecodeError) as exc:
            raise MediaRejected("Invalid media reference. Upload the file again.") from exc

        expected = self._mac(profile, url, content_type, expiry)
        if not hmac.compare_digest(expected, signature):
            raise MediaRejected("Invalid media reference. Upload the file again.")
        expires_at = datetime.fromtimestamp(expiry, UTC)
        if expires_at <= self._now():
            raise MediaRejected("This upload has expired. Upload the file again.")
        return VerifiedMedia(url=url, content_type=content_type, expires_at=expires_at)

    def _mac(self, profile: ProfileKey, url: str, content_type: str, expiry: int) -> str:
        message = "\x1f".join((profile.value, url, content_type, str(expiry))).encode()
        return _b64(hmac.new(self._secret, message, hashlib.sha256).digest())


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))
