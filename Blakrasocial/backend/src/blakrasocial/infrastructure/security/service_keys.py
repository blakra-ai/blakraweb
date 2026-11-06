from __future__ import annotations

import hashlib
import hmac
from collections.abc import Iterable

from blakrasocial.application.errors import Unauthorized


class ServiceKeyVerifier:
    """Authenticates server-to-server calls from the host platform's backend."""

    def __init__(self, keys: Iterable[str]) -> None:
        # Compare digests so that timing never depends on key length or content.
        self._digests = [hashlib.sha256(k.encode()).digest() for k in keys]

    def verify(self, presented: str | None) -> None:
        if not presented or not self._digests:
            raise Unauthorized("A valid service key is required.")
        candidate = hashlib.sha256(presented.encode()).digest()
        if not any(hmac.compare_digest(candidate, d) for d in self._digests):
            raise Unauthorized("A valid service key is required.")
