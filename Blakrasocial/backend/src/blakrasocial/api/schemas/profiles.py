from __future__ import annotations

from pydantic import Field, SecretStr

from blakrasocial.api.schemas.base import CamelModel


class CreateProfileRequest(CamelModel):
    title: str = Field(min_length=1, max_length=120, description="Unique, shown on the linking page")


class CreateProfileResponse(CamelModel):
    profile_key: str


class WhatsAppSetupRequest(CamelModel):
    profile_key: str = Field(min_length=8, max_length=256)
    phone_number_id: str = Field(min_length=5, max_length=32, description="Phone number ID from WhatsApp Manager")
    access_token: SecretStr = Field(description="System-user token with whatsapp_business_messaging")
    display_name: str = Field(min_length=1, max_length=120)
    phone_display: str | None = Field(default=None, max_length=32, description="e.g. +98 912 123 4567")
