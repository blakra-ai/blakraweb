"""Background publisher: `python -m blakrasocial.worker` (run one or more next to the API)."""

from __future__ import annotations

import asyncio
import signal

from blakrasocial.container import build_container
from blakrasocial.infrastructure.logging import configure_logging
from blakrasocial.infrastructure.settings import get_settings


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level, json_output=settings.environment != "development")
    container = build_container(settings)
    direct = container.require_direct()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)
    try:
        await direct.runtime.run(stop)
    finally:
        await container.aclose()


if __name__ == "__main__":
    asyncio.run(main())
