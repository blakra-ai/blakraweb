from __future__ import annotations

import asyncio
import os

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from blakrasocial.infrastructure.persistence.models import Base

target_metadata = Base.metadata


def _url() -> str:
    url = context.config.attributes.get("database_url") or os.environ.get("DATABASE_URL")
    if not url:
        from blakrasocial.infrastructure.settings import Settings

        configured = Settings().database_url
        url = configured.get_secret_value() if configured else None
    if not url:
        raise RuntimeError("Set DATABASE_URL to run migrations")
    return str(url)


def _run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def _run_online() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_run_online())
