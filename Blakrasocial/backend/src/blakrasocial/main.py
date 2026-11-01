from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from blakrasocial import __version__
from blakrasocial.api.errors import install_error_handlers
from blakrasocial.api.middleware import RequestContextMiddleware
from blakrasocial.api.routers import accounts, health, media, platforms, posts, profiles, webhooks
from blakrasocial.container import Container, build_container
from blakrasocial.infrastructure.logging import configure_logging
from blakrasocial.infrastructure.settings import Settings, get_settings


def create_app(
    settings: Settings | None = None,
    container_factory: Callable[[Settings], Container] = build_container,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, json_output=settings.environment != "development")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.container = container_factory(settings)
        try:
            yield
        finally:
            await app.state.container.aclose()

    is_prod = settings.environment == "production"
    app = FastAPI(
        title="Blakrasocial API",
        version=__version__,
        lifespan=lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None,
        openapi_url=None if is_prod else "/openapi.json",
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(settings.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Profile-Key", "Idempotency-Key", "X-Request-Id"],
        expose_headers=["X-Request-Id", "Idempotent-Replayed", "Retry-After"],
        max_age=600,
    )
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)
    for router in (
        health.router,
        platforms.router,
        profiles.router,
        accounts.router,
        media.router,
        posts.router,
        webhooks.router,
    ):
        app.include_router(router)
    return app


def app_factory() -> FastAPI:
    """Entry point for `uvicorn --factory blakrasocial.main:app_factory`."""
    return create_app()
