"""Argon2id (argon2-cffi, MIT): the password hashing winner and OWASP's first recommendation."""

from __future__ import annotations

from argon2 import PasswordHasher as _Argon2
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError


class Argon2PasswordHasher:
    def __init__(self) -> None:
        # OWASP 2025 baseline for argon2id: m=19 MiB, t=2, p=1. We use more memory for margin.
        self._argon = _Argon2(time_cost=3, memory_cost=64 * 1024, parallelism=1)
        self._dummy = self._argon.hash("dummy-password-for-timing")

    def hash(self, password: str) -> str:
        return self._argon.hash(password)

    def verify(self, password_hash: str, password: str) -> bool:
        try:
            return self._argon.verify(password_hash, password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        return self._argon.check_needs_rehash(password_hash)

    def dummy_verify(self) -> None:
        self.verify(self._dummy, "not-the-password")
