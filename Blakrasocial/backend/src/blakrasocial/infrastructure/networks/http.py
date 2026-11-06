"""Shared plumbing for calling a network's API: JSON decoding and error translation."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Mapping
from dataclasses import dataclass
from typing import Any

import httpx

from blakrasocial.application.errors import (
    ApplicationError,
    ProviderAuthError,
    ProviderRateLimited,
    ProviderRejected,
    ProviderUnavailable,
)
from blakrasocial.infrastructure.http.resilient_client import ResilientHttpClient
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class ApiResponse:
    status: int
    headers: httpx.Headers
    body: Any


Translator = Callable[[int, Any, httpx.Headers], ApplicationError | None]


def default_error(network: str, status: int, message: str | None, headers: httpx.Headers) -> ApplicationError:
    text = message or f"{network} returned an error ({status})."
    if status == 401:
        return ProviderAuthError(text)
    if status == 429:
        retry = headers.get("Retry-After")
        return ProviderRateLimited(text, int(retry) if retry and retry.isdigit() else None)
    if status >= 500:
        return ProviderUnavailable(text)
    return ProviderRejected(text)


class NetworkApi:
    """One network's HTTP surface. `translate` maps that network's error bodies to our errors."""

    def __init__(self, http: ResilientHttpClient, network: str, translate: Translator) -> None:
        self._http = http
        self._network = network
        self._translate = translate

    async def call(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str] | None = None,
        json: Any = None,
        params: Mapping[str, Any] | None = None,
        data: Mapping[str, Any] | None = None,
        content: bytes | None = None,
        idempotent: bool | None = None,
    ) -> ApiResponse:
        try:
            response = await self._http.request(
                method,
                url,
                headers=headers,
                json=json,
                params=params,
                data=data,
                content=content,
                idempotent=idempotent,
            )
        except httpx.TimeoutException as exc:
            raise ProviderUnavailable(f"{self._network} timed out.") from exc
        except httpx.TransportError as exc:
            raise ProviderUnavailable(f"Could not reach {self._network}.") from exc

        body = _decode(response)
        error = self._translate(response.status_code, body, response.headers)
        if error is not None:
            _log.warning(
                "network_error",
                network=self._network,
                status=response.status_code,
                error_type=type(error).__name__,
                message=error.message[:300],
            )
            raise error
        return ApiResponse(response.status_code, response.headers, body)


def _decode(response: httpx.Response) -> Any:
    if not response.content:
        return {}
    try:
        return response.json()
    except ValueError:
        return {"_text": response.text[:500]}


class MediaSource:
    """Reads uploaded files back from our storage, for networks that want the bytes pushed to them."""

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def read_all(self, url: str, max_bytes: int = 200 * 1024 * 1024) -> bytes:
        chunks = [c async for c in self.chunks(url, 8 * 1024 * 1024)]
        data = b"".join(chunks)
        if len(data) > max_bytes:
            raise ProviderRejected("File is too large for this network.")
        return data

    async def chunks(self, url: str, size: int) -> AsyncIterator[bytes]:
        """Yields consecutive pieces of exactly `size` bytes (the last one may be shorter)."""
        buffer = bytearray()
        try:
            async with self._client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise ProviderUnavailable(f"Could not read the uploaded file ({response.status_code}).")
                async for piece in response.aiter_bytes():
                    buffer.extend(piece)
                    while len(buffer) >= size:
                        yield bytes(buffer[:size])
                        del buffer[:size]
        except httpx.TransportError as exc:
            raise ProviderUnavailable("Could not read the uploaded file.") from exc
        if buffer:
            yield bytes(buffer)
