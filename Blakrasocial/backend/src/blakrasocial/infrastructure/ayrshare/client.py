from __future__ import annotations

from typing import Any

import httpx

from blakrasocial.application.errors import (
    NotFound,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimited,
    ProviderRejected,
    ProviderUnavailable,
)
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.http.resilient_client import ResilientHttpClient
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)

# Ayrshare error codes that mean "no such resource".
_NOT_FOUND_CODES = frozenset({114, 221})


class AyrshareClient:
    """Low-level transport: auth headers, JSON decoding, and error translation."""

    def __init__(self, http: ResilientHttpClient, base_url: str, api_key: str) -> None:
        self._http = http
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    async def call(
        self,
        method: str,
        path: str,
        *,
        profile: ProfileKey | None = None,
        json: Any = None,
        params: dict[str, Any] | None = None,
        idempotent: bool | None = None,
        not_found_ok: bool = False,
    ) -> Any:
        headers = {"Authorization": f"Bearer {self._api_key}", "Accept": "application/json"}
        if profile is not None:
            headers["Profile-Key"] = profile.value
        try:
            response = await self._http.request(
                method,
                f"{self._base_url}{path}",
                headers=headers,
                json=json,
                params=params,
                idempotent=idempotent,
            )
        except httpx.TimeoutException as exc:
            raise ProviderUnavailable("The social media provider timed out.") from exc
        except httpx.TransportError as exc:
            raise ProviderUnavailable("Could not reach the social media provider.") from exc

        body = _decode(response)
        if response.is_success and not _is_error_body(body):
            return body
        return self._raise(response, body, path, not_found_ok)

    @staticmethod
    def _raise(response: httpx.Response, body: Any, path: str, not_found_ok: bool) -> Any:
        status = response.status_code
        code, message = _error_details(body)
        _log.warning("ayrshare_error", path=path, status=status, code=code, message=message)

        if code in _NOT_FOUND_CODES or status == 404:
            if not_found_ok:
                return None
            raise NotFound(message or "Not found.")
        if status in (401, 403):
            raise ProviderAuthError(message or "Provider rejected our credentials.", code)
        if status == 429:
            retry_after = response.headers.get("Retry-After")
            raise ProviderRateLimited(
                message or "Too many requests to the provider.",
                int(retry_after) if retry_after and retry_after.isdigit() else None,
            )
        if status >= 500:
            raise ProviderUnavailable(message or "The social media provider failed.", code)
        if 400 <= status < 500 or _is_error_body(body):
            raise ProviderRejected(message or "The provider rejected the request.", code)
        raise ProviderError(message or f"Unexpected provider response {status}.", code)


def _decode(response: httpx.Response) -> Any:
    if not response.content:
        return {}
    try:
        return response.json()
    except ValueError:
        return {"status": "error", "message": response.text[:500]}


def _is_error_body(body: Any) -> bool:
    return isinstance(body, dict) and body.get("status") == "error" and not body.get("postIds")


def _error_details(body: Any) -> tuple[int | None, str | None]:
    if not isinstance(body, dict):
        return None, None
    code = body.get("code")
    message = body.get("message")
    errors = body.get("errors")
    if (code is None or message is None) and isinstance(errors, list) and errors:
        first = errors[0] if isinstance(errors[0], dict) else {}
        code = code if code is not None else first.get("code")
        message = message or first.get("message")
    try:
        code = int(code) if code is not None else None
    except (TypeError, ValueError):
        code = None
    return code, message
