from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

import httpx
from tenacity import (
    AsyncRetrying,
    RetryCallState,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})


class RetryableStatus(Exception):
    def __init__(self, response: httpx.Response) -> None:
        super().__init__(f"retryable status {response.status_code}")
        self.response = response


class ResilientHttpClient:
    """httpx.AsyncClient with timeouts plus exponential backoff and jitter.

    Retries are safe by construction:
    * transport errors before the request was sent (connect errors) are always retried;
    * 429/5xx and read timeouts are retried only when the call is idempotent
      (GET/DELETE, or a POST carrying the provider's idempotency key).
    """

    def __init__(
        self,
        client: httpx.AsyncClient,
        max_retries: int = 3,
        wait: Callable[[RetryCallState], float] | None = None,
    ) -> None:
        self._client = client
        self._max_attempts = max(1, max_retries + 1)
        self._wait = wait or _wait_with_retry_after

    async def aclose(self) -> None:
        await self._client.aclose()

    async def request(
        self,
        method: str,
        url: str,
        *,
        idempotent: bool | None = None,
        headers: Mapping[str, str] | None = None,
        json: Any = None,
        params: Mapping[str, Any] | None = None,
        data: Mapping[str, Any] | None = None,
        content: bytes | None = None,
    ) -> httpx.Response:
        safe = idempotent if idempotent is not None else method.upper() in {"GET", "HEAD", "DELETE", "PUT"}

        def should_retry(exc: BaseException) -> bool:
            if isinstance(exc, httpx.ConnectError | httpx.ConnectTimeout | httpx.PoolTimeout):
                return True
            if not safe:
                return False
            return isinstance(exc, RetryableStatus | httpx.ReadTimeout | httpx.RemoteProtocolError)

        retrying = AsyncRetrying(
            stop=stop_after_attempt(self._max_attempts),
            wait=self._wait,
            retry=retry_if_exception(should_retry),
            reraise=True,
            before_sleep=_log_retry,
        )
        try:
            async for attempt in retrying:
                with attempt:
                    response = await self._client.request(
                        method, url, headers=headers, json=json, params=params, data=data, content=content
                    )
                    if response.status_code in _RETRYABLE_STATUS and safe:
                        raise RetryableStatus(response)
                    return response
        except RetryableStatus as exc:
            return exc.response
        raise AssertionError("unreachable")  # pragma: no cover


_exponential = wait_exponential_jitter(multiplier=0.5, max=8.0, jitter=0.5)


def _wait_with_retry_after(state: RetryCallState) -> float:
    exc = state.outcome.exception() if state.outcome else None
    if isinstance(exc, RetryableStatus):
        header = exc.response.headers.get("Retry-After")
        if header and header.isdigit():
            return min(float(header), 30.0)
    return float(_exponential(state))


def _log_retry(state: RetryCallState) -> None:
    exc = state.outcome.exception() if state.outcome else None
    _log.warning("http_retry", attempt=state.attempt_number, error=str(exc))
