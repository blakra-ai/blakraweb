from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from enum import StrEnum
from typing import Protocol


class RecordState(StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


@dataclass(frozen=True, slots=True)
class IdempotencyRecord:
    state: RecordState
    request_hash: str
    payload: str | None = None  # serialized result once completed


class IdempotencyStore(Protocol):
    async def reserve(self, key: str, request_hash: str, ttl: timedelta) -> IdempotencyRecord | None:
        """Atomically claim `key`. Returns None if claimed, or the existing record."""
        ...

    async def complete(self, key: str, request_hash: str, payload: str, ttl: timedelta) -> None: ...

    async def release(self, key: str) -> None:
        """Forget an in-progress claim after a failure so the client can retry."""
        ...
