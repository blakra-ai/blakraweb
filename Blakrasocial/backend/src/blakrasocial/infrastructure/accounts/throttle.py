"""Slows down password guessing: after too many failures a key (email or IP) waits it out."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any


class InMemoryLoginThrottle:
    """Single API instance only; use `RedisLoginThrottle` when running several."""

    def __init__(
        self, max_failures: int = 5, window_seconds: int = 900, now: Callable[[], float] = time.monotonic
    ) -> None:
        self._max = max_failures
        self._window = window_seconds
        self._now = now
        self._failures: dict[str, list[float]] = {}

    def _recent(self, key: str) -> list[float]:
        cutoff = self._now() - self._window
        recent = [t for t in self._failures.get(key, []) if t > cutoff]
        if recent:
            self._failures[key] = recent
        else:
            self._failures.pop(key, None)
        return recent

    async def check(self, key: str) -> int | None:
        recent = self._recent(key)
        if len(recent) < self._limit(key):
            return None
        return max(1, int(recent[0] + self._window - self._now()))

    async def failed(self, key: str) -> None:
        self._recent(key)
        self._failures.setdefault(key, []).append(self._now())

    async def reset(self, key: str) -> None:
        self._failures.pop(key, None)

    def _limit(self, key: str) -> int:
        return self._max * 6 if key.startswith("ip:") else self._max  # many people can share one IP


class RedisLoginThrottle:
    def __init__(self, redis: Any, max_failures: int = 5, window_seconds: int = 900) -> None:
        self._redis = redis
        self._max = max_failures
        self._window = window_seconds

    @staticmethod
    def _key(key: str) -> str:
        return f"bs:login:{key}"

    async def check(self, key: str) -> int | None:
        count = int(await self._redis.get(self._key(key)) or 0)
        limit = self._max * 6 if key.startswith("ip:") else self._max
        if count < limit:
            return None
        ttl = int(await self._redis.ttl(self._key(key)))
        return max(ttl, 1)

    async def failed(self, key: str) -> None:
        name = self._key(key)
        count = await self._redis.incr(name)
        if count == 1:
            await self._redis.expire(name, self._window)

    async def reset(self, key: str) -> None:
        await self._redis.delete(self._key(key))
