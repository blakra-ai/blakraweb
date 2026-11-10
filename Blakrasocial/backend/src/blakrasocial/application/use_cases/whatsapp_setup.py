from __future__ import annotations

from dataclasses import dataclass

from blakrasocial.application.errors import NotFound, ProviderAuthError, ProviderError
from blakrasocial.application.ports.direct_messenger import WhatsAppNumberVerifier
from blakrasocial.application.ports.repositories import CredentialRepository, ProfileRepository, profile_id_of
from blakrasocial.domain.entities import ConnectedAccount, OAuthCredential
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.errors import InvalidValue
from blakrasocial.domain.value_objects import ProfileKey


@dataclass(frozen=True, slots=True)
class WhatsAppSetupCommand:
    profile: ProfileKey
    phone_number_id: str
    access_token: str
    display_name: str
    phone_display: str | None = None


class SetupWhatsApp:
    """Admin-only: attaches a Meta-approved WhatsApp Business number (Cloud API) to a profile.

    WhatsApp has no consumer OAuth; the business owner's number is registered in Meta Business
    Manager and its system-user token is stored here, encrypted like every other credential.
    """

    def __init__(
        self,
        profiles: ProfileRepository,
        credentials: CredentialRepository,
        verifier: WhatsAppNumberVerifier | None = None,
    ) -> None:
        self._profiles = profiles
        self._credentials = credentials
        self._verifier = verifier

    async def execute(self, command: WhatsAppSetupCommand) -> None:
        if not command.phone_number_id.isdigit():
            raise InvalidValue("phoneNumberId", "must be the numeric phone-number id from Meta")
        pid = profile_id_of(command.profile)
        if not await self._profiles.exists(pid):
            raise NotFound("Unknown profile.")
        phone_display = command.phone_display
        if self._verifier is not None:
            # Catch a wrong id/token now, not when the first message silently fails.
            try:
                info = await self._verifier.verify(command.phone_number_id, command.access_token)
            except ProviderAuthError as exc:
                raise InvalidValue("accessToken", f"was rejected by Meta: {exc.message}") from exc
            except ProviderError as exc:
                raise InvalidValue("phoneNumberId", f"was rejected by Meta: {exc.message}") from exc
            phone_display = phone_display or info.display_phone_number
        await self._credentials.save(
            pid,
            OAuthCredential(
                platform=Platform.WHATSAPP,
                account_id=command.phone_number_id,
                account=ConnectedAccount(
                    Platform.WHATSAPP,
                    display_name=command.display_name,
                    username=phone_display,
                    account_type="business",
                ),
                access_token=command.access_token,
            ),
        )
