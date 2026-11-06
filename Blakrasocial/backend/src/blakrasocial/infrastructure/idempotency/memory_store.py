from __future__ import annotations

import asyncio
import time
from datetime import timedelta

from blakrasocial.application.ports.idempotency_store import IdempotencyRecord, RecordState


class InMemoryIdempotencyStore:
    """Single-process store. Fine for one instance or local development; use Redis otherwise."""

    def __init__(self, max_entries: int = 10_000) -> None:
        self._entries: dict[str, tuple[float, IdempotencyRecord]] = {}
        self._lock = asyncio.Lock()
        self._max_entries = max_entries

    async def reserve(self, key: str, request_hash: str, ttl: timedelta) -> IdempotencyRecord | None:
        async with self._lock:
            self._evict()
            entry = self._entries.get(key)
            if entry is not None:
                return entry[1]
            self._entries[key] = (
                time.monotonic() + ttl.total_seconds(),
                IdempotencyRecord(RecordState.IN_PROGRESS, request_hash),
            )
            return None

    async def complete(self, key: str, request_hash: str, payload: str, ttl: timedelta) -> None:
        async with self._lock:
            self._entries[key] = (
                time.monotonic() + ttl.total_seconds(),
                IdempotencyRecord(RecordState.COMPLETED, request_hash, payload),
            )

    async def release(self, key: str) -> None:
        async with self._lock:
            self._entries.pop(key, None)

    def _evict(self) -> None:
        now = time.monotonic()
        for key in [k for k, (expires, _) in self._entries.items() if expires <= now]:
            del self._entries[key]
        while len(self._entries) >= self._max_entries:
            self._entries.pop(next(iter(self._entries)))
