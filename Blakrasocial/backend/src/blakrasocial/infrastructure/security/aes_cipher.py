from __future__ import annotations

import base64
import os
from collections.abc import Sequence

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_VERSION = "v1"


class AesGcmCipher:
    """AES-256-GCM with a random 96-bit nonce per message and the row identity as associated data.

    Format: ``v1.<key id>.<base64url(nonce || ciphertext+tag)>``. The first key encrypts; every key
    decrypts, so keys can be rotated by prepending a new one and re-saving rows over time.
    """

    def __init__(self, keys: Sequence[tuple[str, bytes]]) -> None:
        if not keys:
            raise ValueError("at least one encryption key is required")
        for kid, key in keys:
            if len(key) != 32 or not kid or "." in kid:
                raise ValueError("keys must be 32 bytes with a non-empty id without '.'")
        self._active_kid = keys[0][0]
        self._keys = {kid: AESGCM(key) for kid, key in keys}

    def encrypt(self, plaintext: str, *, context: str) -> str:
        nonce = os.urandom(12)
        sealed = self._keys[self._active_kid].encrypt(nonce, plaintext.encode(), context.encode())
        return f"{_VERSION}.{self._active_kid}.{base64.urlsafe_b64encode(nonce + sealed).decode()}"

    def decrypt(self, ciphertext: str, *, context: str) -> str:
        try:
            version, kid, payload = ciphertext.split(".", 2)
            if version != _VERSION:
                raise ValueError("unknown format")
            raw = base64.urlsafe_b64decode(payload)
            return self._keys[kid].decrypt(raw[:12], raw[12:], context.encode()).decode()
        except (ValueError, KeyError, InvalidTag) as exc:
            raise ValueError("credential could not be decrypted (wrong key or tampered data)") from exc
