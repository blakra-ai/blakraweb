"""One-off data fixes the owner runs from the CLI when the setup changes."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from blakrasocial.domain.value_objects import MediaUrl
from blakrasocial.infrastructure.persistence.models import PostRow


class MediaBaseUrlMigration:
    """Points stored media at a new public bucket address (for example r2.dev -> media.example.com).

    Posts keep the full URL of each file so the networks can download it when a scheduled post is
    due. When the bucket's public address changes, the same files (same keys) are reachable under
    the new address, so only the prefix is rewritten. Files must already be readable there.
    """

    def __init__(self, sessions: async_sessionmaker[AsyncSession]) -> None:
        self._sessions = sessions

    async def run(self, old_base: str, new_base: str) -> int:
        old, new = self._prefix(old_base), self._prefix(new_base)
        if old == new:
            return 0
        changed = 0
        async with self._sessions() as session, session.begin():
            for post in (await session.execute(select(PostRow))).scalars():
                media, moved = self._rewrite(post.media, old, new)
                if moved:
                    post.media = media
                    changed += 1
        return changed

    @staticmethod
    def _prefix(base: str) -> str:
        MediaUrl(base)  # an absolute https address, or InvalidValue
        return base.rstrip("/") + "/"

    @staticmethod
    def _rewrite(media: list[Any], old: str, new: str) -> tuple[list[Any], bool]:
        moved = False
        result: list[Any] = []
        for item in media:
            url = item.get("url", "") if isinstance(item, dict) else ""
            if url.startswith(old):
                result.append({**item, "url": new + url[len(old) :]})
                moved = True
            else:
                result.append(item)
        return result, moved
