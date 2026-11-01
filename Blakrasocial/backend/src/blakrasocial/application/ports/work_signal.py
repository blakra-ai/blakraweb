from __future__ import annotations

from typing import Protocol


class WorkSignal(Protocol):
    """Lets the API wake an in-process worker right away instead of waiting for its next poll."""

    def notify(self) -> None: ...
