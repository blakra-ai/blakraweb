"""Closing an account for good (privacy request or offboarding)."""

from __future__ import annotations

from dataclasses import dataclass

from blakrasocial.application.direct.publisher import media_prefix
from blakrasocial.application.errors import Forbidden, NotFound
from blakrasocial.application.ports.accounts import SessionRepository, UserRepository
from blakrasocial.application.ports.object_storage import ObjectStorage
from blakrasocial.application.ports.repositories import ProfileRepository, profile_id_of


@dataclass(frozen=True, slots=True)
class DeletedAccount:
    email: str
    media_files: int


class DeleteAccount:
    """Removes a user and everything that belongs to them: sign-in sessions, connected-network
    tokens, scheduled and past posts, and uploaded media. Cannot be undone.

    Order matters: sign-in ends first, then media, then the database rows, so a failure part-way
    can simply be retried (each step is idempotent)."""

    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        profiles: ProfileRepository,
        storage: ObjectStorage,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._profiles = profiles
        self._storage = storage

    async def execute(self, actor_id: str, user_id: str) -> DeletedAccount:
        if user_id == actor_id:
            raise Forbidden("You can't delete your own account.")
        user = await self._users.by_id(user_id)
        if user is None:
            raise NotFound("Unknown user.")
        await self._sessions.revoke_user(user.id)
        profile_id = profile_id_of(user.profile_key)
        removed = await self._storage.delete_prefix(media_prefix(profile_id))
        await self._profiles.delete(profile_id)
        await self._users.delete(user.id)
        return DeletedAccount(user.email, removed)
