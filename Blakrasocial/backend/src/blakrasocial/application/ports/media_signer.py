from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from blakrasocial.domain.value_objects import ProfileKey


@dataclass(frozen=True, slots=True)
class VerifiedMedia:
    url: str
    content_type: str
    expires_at: datetime


class MediaReferenceSigner(Protocol):
    """Binds an uploaded file URL to the profile that uploaded it.

    Publishing accepts only URLs carrying a valid token, which blocks SSRF through
    arbitrary URLs and stops one customer from posting another customer's files.
    """

    def sign(self, profile: ProfileKey, url: str, content_type: str, expires_at: datetime) -> str: ...

    def verify(self, profile: ProfileKey, url: str, token: str) -> VerifiedMedia: ...
