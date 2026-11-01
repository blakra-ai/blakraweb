"""Runs the real backend in direct mode with every network host rerouted to fake_networks.py.

Only the transport is swapped: the backend still builds the real URLs (graph.instagram.com, ...),
and this rewrites them to https://localhost:9444/<host>/<path> just before they leave the process.
Test-only; never used by the application itself.

    python direct_backend.py    # same env as the normal backend, see README.md in this folder
"""

from __future__ import annotations

import os
from typing import Any

import httpx
import uvicorn

FAKE = httpx.URL(os.environ.get("FAKE_NETWORKS_URL", "https://localhost:9444"))
HOSTS = {
    "graph.instagram.com",
    "api.instagram.com",
    "graph.facebook.com",
    "rupload.facebook.com",
    "open.tiktokapis.com",
    "api.linkedin.com",
    "www.linkedin.com",
}


class _Reroute(httpx.AsyncBaseTransport):
    def __init__(self, inner: httpx.AsyncBaseTransport) -> None:
        self._inner = inner

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        if request.url.host in HOSTS:
            request.url = FAKE.copy_with(path=f"/{request.url.host}{request.url.path}", query=request.url.query)
            request.headers["host"] = FAKE.netloc.decode()
        return await self._inner.handle_async_request(request)

    async def aclose(self) -> None:
        await self._inner.aclose()


_original_init = httpx.AsyncClient.__init__


def _patched_init(self: httpx.AsyncClient, *args: Any, **kwargs: Any) -> None:
    _original_init(self, *args, **kwargs)
    self._transport = _Reroute(self._transport)


httpx.AsyncClient.__init__ = _patched_init  # type: ignore[method-assign]

if __name__ == "__main__":
    uvicorn.run("blakrasocial.main:app_factory", factory=True, host="127.0.0.1", port=8000, log_level="info")
