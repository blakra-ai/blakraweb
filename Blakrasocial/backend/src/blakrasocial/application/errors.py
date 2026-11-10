from __future__ import annotations


class ApplicationError(Exception):
    """Base class for failures that a use case reports to its caller."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFound(ApplicationError):
    pass


class Unauthorized(ApplicationError):
    pass


class Forbidden(ApplicationError):
    pass


class InvalidSignature(ApplicationError):
    pass


class Conflict(ApplicationError):
    """The request clashes with existing data (e.g. an email that is already registered)."""


class TooManyAttempts(ApplicationError):
    def __init__(self, message: str, retry_after_seconds: int) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class MediaRejected(ApplicationError):
    """A media reference is forged, expired, unreachable or of an unsupported type."""

    def __init__(self, message: str, field: str = "media") -> None:
        super().__init__(message)
        self.field = field


class IdempotencyConflict(ApplicationError):
    """The same Idempotency-Key was reused with a different request body."""


class RequestInProgress(ApplicationError):
    """A request with this Idempotency-Key is still being processed."""


class ProviderError(ApplicationError):
    """The social media provider failed. Subclasses say how."""

    def __init__(self, message: str, provider_code: str | int | None = None) -> None:
        super().__init__(message)
        self.provider_code = provider_code


class ProviderUnavailable(ProviderError):
    pass


class ProviderRateLimited(ProviderError):
    def __init__(self, message: str, retry_after_seconds: int | None = None) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class ProviderRejected(ProviderError):
    """The provider understood the request and refused it (bad input, plan limits, ...)."""


class ProviderAuthError(ProviderError):
    """Our provider credentials are wrong or the profile key is unknown."""


class NotConfigured(ApplicationError):
    """A network is not set up for this deployment (its app id/secret are missing)."""
