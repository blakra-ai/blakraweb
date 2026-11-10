from __future__ import annotations

import json
from datetime import timedelta
from typing import TYPE_CHECKING

from blakrasocial.application.ports.idempotency_store import IdempotencyRecord, RecordState

if TYPE_CHECKING:
    from redis.asyncio import Redis

# A claim that is never completed (process crash) expires after this long.
_IN_PROGRESS_TTL = timedelta(minutes=5)


class RedisIdempotencyStore:
    """Shared store for multiple instances. `SET NX` makes the claim atomic."""

    def __init__(self, redis: Redis, prefix: str = "blakrasocial:idem:") -> None:
        self._redis = redis
        self._prefix = prefix

    async def reserve(self, key: str, request_hash: str, ttl: timedelta) -> IdempotencyRecord | None:
        value = json.dumps({"state": RecordState.IN_PROGRESS.value, "hash": request_hash})
        claimed = await self._redis.set(self._prefix + key, value, nx=True, ex=int(_IN_PROGRESS_TTL.total_seconds()))
        if claimed:
            return None
        raw = await self._redis.get(self._prefix + key)
        if raw is None:  # expired between the two calls: try once more
            return await self.reserve(key, request_hash, ttl)
        data = json.loads(raw)
        return IdempotencyRecord(RecordState(data["state"]), data["hash"], data.get("payload"))

    async def complete(self, key: str, request_hash: str, payload: str, ttl: timedelta) -> None:
        value = json.dumps({"state": RecordState.COMPLETED.value, "hash": request_hash, "payload": payload})
        await self._redis.set(self._prefix + key, value, ex=int(ttl.total_seconds()))

    async def release(self, key: str) -> None:
        await self._redis.delete(self._prefix + key)
