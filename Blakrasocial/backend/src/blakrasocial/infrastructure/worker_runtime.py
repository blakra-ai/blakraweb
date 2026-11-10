from __future__ import annotations

import asyncio
import time

from blakrasocial.application.direct import PublishWorker, TokenRefresher
from blakrasocial.infrastructure.logging import get_logger

_log = get_logger("worker")


class AsyncioWorkSignal:
    """`WorkSignal` for a worker running in the same process as the API."""

    def __init__(self) -> None:
        self._event = asyncio.Event()

    def notify(self) -> None:
        self._event.set()

    async def wait(self, seconds: float) -> None:
        try:
            async with asyncio.timeout(seconds):
                await self._event.wait()
        except TimeoutError:
            pass
        finally:
            self._event.clear()


class WorkerRuntime:
    """Loop: publish due targets; refresh tokens every few minutes; sleep until signalled or polled."""

    def __init__(
        self,
        publisher: PublishWorker,
        refresher: TokenRefresher,
        signal: AsyncioWorkSignal,
        poll_seconds: float,
        refresh_every_seconds: float = 900.0,
    ) -> None:
        self._publisher = publisher
        self._refresher = refresher
        self._signal = signal
        self._poll_seconds = poll_seconds
        self._refresh_every = refresh_every_seconds
        self._last_refresh = 0.0

    async def run(self, stop: asyncio.Event) -> None:
        _log.info("worker_started", poll_seconds=self._poll_seconds)
        while not stop.is_set():
            handled = await self._safe(self._publisher.run_once, "publish_batch_failed")
            if time.monotonic() - self._last_refresh >= self._refresh_every:
                self._last_refresh = time.monotonic()
                renewed = await self._safe(self._refresher.run_once, "token_refresh_failed")
                if renewed:
                    _log.info("tokens_refreshed", count=renewed)
            if not handled:
                waiter = asyncio.ensure_future(self._signal.wait(self._poll_seconds))
                stopper = asyncio.ensure_future(stop.wait())
                await asyncio.wait({waiter, stopper}, return_when=asyncio.FIRST_COMPLETED)
                for task in (waiter, stopper):
                    task.cancel()
        _log.info("worker_stopped")

    @staticmethod
    async def _safe(job: object, event: str) -> int:
        try:
            return int(await job())  # type: ignore[operator]
        except Exception as exc:  # the loop must survive a bad batch or a database blip
            _log.exception(event, error=repr(exc))
            await asyncio.sleep(2)
            return 0
