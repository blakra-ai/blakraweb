"""Error translation shared by Instagram, Facebook and WhatsApp (all Meta Graph APIs)."""

from __future__ import annotations

from typing import Any

import httpx

from blakrasocial.application.errors import (
    ApplicationError,
    ProviderAuthError,
    ProviderRateLimited,
    ProviderRejected,
    ProviderUnavailable,
)
from blakrasocial.infrastructure.networks.http import default_error

_AUTH_CODES = frozenset({102, 190, 458, 459, 460, 463, 467})
_RATE_CODES = frozenset({4, 17, 32, 341, 613, 80001, 80002, 80004, 80005, 80006, 80008, 80014, 130429})
_TRANSIENT_CODES = frozenset({1, 2})


def translate(status: int, body: Any, headers: httpx.Headers) -> ApplicationError | None:
    error = body.get("error") if isinstance(body, dict) else None
    if status < 400 and not error:
        return None
    if isinstance(error, dict):
        code = error.get("code")
        message = str(error.get("error_user_msg") or error.get("message") or "Meta returned an error.")
        if code in _AUTH_CODES:
            return ProviderAuthError(message, code)
        if code in _RATE_CODES:
            return ProviderRateLimited(message)
        if code in _TRANSIENT_CODES or error.get("is_transient"):
            return ProviderUnavailable(message, code)
        if status < 500:
            return ProviderRejected(message, code)
    if isinstance(body, dict) and body.get("error_message"):  # Instagram OAuth error shape
        return default_error("Instagram", status if status >= 400 else 400, str(body["error_message"]), headers)
    return default_error("Meta", status, None, headers)
