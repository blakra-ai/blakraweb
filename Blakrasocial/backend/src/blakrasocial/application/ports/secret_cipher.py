from __future__ import annotations

from typing import Protocol


class SecretCipher(Protocol):
    """Authenticated encryption for tokens at rest. `context` binds a ciphertext to its row,
    so a ciphertext copied into another customer's row fails to decrypt."""

    def encrypt(self, plaintext: str, *, context: str) -> str: ...

    def decrypt(self, ciphertext: str, *, context: str) -> str: ...
