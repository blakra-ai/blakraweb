from __future__ import annotations

from pydantic import Field

from blakrasocial.api.schemas.base import CamelModel


class CreateProfileRequest(CamelModel):
    title: str = Field(min_length=1, max_length=120, description="Unique, shown on the linking page")


class CreateProfileResponse(CamelModel):
    profile_key: str
