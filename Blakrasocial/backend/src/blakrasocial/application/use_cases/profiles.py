from __future__ import annotations

from blakrasocial.application.dto import CreateProfileCommand
from blakrasocial.application.ports import SocialPublisher
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import ProfileKey


class CreateProfile:
    def __init__(self, publisher: SocialPublisher) -> None:
        self._publisher = publisher

    async def execute(self, command: CreateProfileCommand) -> ProfileKey:
        title = command.title.strip()
        if not 1 <= len(title) <= 120:
            raise InvalidValue("title", "must be 1-120 characters")
        return await self._publisher.create_profile(title)
