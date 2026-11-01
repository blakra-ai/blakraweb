from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from blakrasocial.api.schemas.posts import issue_out
from blakrasocial.api.schemas.problem import Problem, ProblemIssue
from blakrasocial.application import errors as app
from blakrasocial.domain.errors import InvalidValue, ValidationFailed
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger(__name__)
_TYPE_BASE = "https://blakrasocial.dev/problems/"

# Typed exception → (HTTP status, problem type slug, title)
_MAPPING: Sequence[tuple[type[Exception], int, str, str]] = (
    (app.Unauthorized, 401, "unauthorized", "Authentication required"),
    (app.InvalidSignature, 401, "invalid-signature", "Invalid webhook signature"),
    (app.Forbidden, 403, "forbidden", "Not allowed"),
    (app.NotFound, 404, "not-found", "Not found"),
    (app.IdempotencyConflict, 409, "idempotency-conflict", "Idempotency key reused"),
    (app.RequestInProgress, 409, "request-in-progress", "Request in progress"),
    (app.MediaRejected, 422, "media-rejected", "Media rejected"),
    (app.NotConfigured, 409, "not-configured", "Network not set up"),
    (app.ProviderRateLimited, 429, "rate-limited", "Too many requests"),
    (app.ProviderRejected, 422, "provider-rejected", "The social network rejected the request"),
    (app.ProviderAuthError, 502, "provider-auth", "Provider authentication failed"),
    (app.ProviderUnavailable, 503, "provider-unavailable", "Provider unavailable"),
    (app.ProviderError, 502, "provider-error", "Provider error"),
)


def _problem(
    request: Request,
    status: int,
    slug: str,
    title: str,
    detail: str | None = None,
    errors: list[ProblemIssue] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = Problem(
        type=_TYPE_BASE + slug,
        title=title,
        status=status,
        detail=detail,
        instance=request.url.path,
        request_id=getattr(request.state, "request_id", None),
        errors=errors,
    )
    return JSONResponse(
        body.model_dump(by_alias=True, exclude_none=True),
        status_code=status,
        media_type="application/problem+json",
        headers=headers,
    )


def install_error_handlers(app_: FastAPI) -> None:
    @app_.exception_handler(ValidationFailed)
    async def _validation_failed(request: Request, exc: ValidationFailed) -> JSONResponse:
        issues = [issue_out(i) for i in exc.issues]
        return _problem(request, 422, "validation", "Validation failed", f"{len(issues)} issue(s)", issues)

    @app_.exception_handler(InvalidValue)
    async def _invalid_value(request: Request, exc: InvalidValue) -> JSONResponse:
        issue = ProblemIssue(code="invalid_value", field=exc.field, message=exc.message)
        return _problem(request, 422, "validation", "Validation failed", exc.message, [issue])

    @app_.exception_handler(RequestValidationError)
    async def _request_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        issues = [
            ProblemIssue(
                code="invalid_request",
                field=".".join(str(p) for p in err.get("loc", ())[1:]) or "body",
                message=str(err.get("msg", "Invalid value")),
            )
            for err in exc.errors()
        ]
        return _problem(request, 422, "validation", "Invalid request", None, issues)

    @app_.exception_handler(app.ApplicationError)
    async def _application(request: Request, exc: app.ApplicationError) -> JSONResponse:
        for exc_type, status, slug, title in _MAPPING:
            if isinstance(exc, exc_type):
                headers = _headers_for(exc)
                errors = None
                if isinstance(exc, app.MediaRejected):
                    errors = [ProblemIssue(code="media_rejected", field=exc.field, message=exc.message)]
                if status >= 500:
                    _log.error("provider_failure", error=exc.message, kind=slug)
                return _problem(request, status, slug, title, exc.message, errors, headers)
        _log.error("unmapped_application_error", error=exc.message)
        return _problem(request, 500, "internal", "Internal error")

    @app_.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _problem(request, exc.status_code, "http", str(exc.detail), None)

    @app_.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception) -> JSONResponse:
        _log.exception("unhandled_error", path=request.url.path)
        return _problem(request, 500, "internal", "Internal error", "Something went wrong.")


def _headers_for(exc: Any) -> dict[str, str] | None:
    if isinstance(exc, app.ProviderRateLimited) and exc.retry_after_seconds:
        return {"Retry-After": str(exc.retry_after_seconds)}
    if isinstance(exc, app.Unauthorized):
        return {"WWW-Authenticate": "Bearer"}
    return None
