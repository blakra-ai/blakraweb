"""TikTok requires apps to show the creator's current options before every post; this reads them."""

from __future__ import annotations

from blakrasocial.application.errors import NotFound, ProviderAuthError
from blakrasocial.application.ports.clock import Clock
from blakrasocial.application.ports.platform_connector import CreatorInfoReader
from blakrasocial.application.ports.repositories import CredentialRepository, profile_id_of
from blakrasocial.domain.entities import TikTokCreatorInfo
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.value_objects import ProfileKey


class GetTikTokCreatorInfo:
    def __init__(self, credentials: CredentialRepository, reader: CreatorInfoReader, clock: Clock) -> None:
        self._credentials = credentials
        self._reader = reader
        self._clock = clock

    async def execute(self, profile: ProfileKey) -> TikTokCreatorInfo:
        pid = profile_id_of(profile)
        credential = await self._credentials.get(pid, Platform.TIKTOK)
        if credential is None:
            raise NotFound("TikTok isn't connected.")
        if not credential.is_usable(self._clock.now()):
            raise ProviderAuthError("TikTok needs to be reconnected. Open Connections and connect it again.")
        try:
            return await self._reader.creator_info(credential)
        except ProviderAuthError:
            await self._credentials.mark_needs_reconnect(pid, Platform.TIKTOK)
            raise
