from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from blakrasocial.domain.errors import InvalidValue

_IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9_\-:.]{8,128}$")
_E164_DIGITS = re.compile(r"^[1-9]\d{6,14}$")
_HASHTAG = re.compile(r"(?<!\w)#\w+", re.UNICODE)
_MENTION = re.compile(r"(?<!\w)@[\w.]+", re.UNICODE)


@dataclass(frozen=True, slots=True)
class ProfileKey:
    """Identifies one customer at the provider. Treated as a secret: never logged in full."""

    value: str

    def __post_init__(self) -> None:
        if not self.value or len(self.value) > 256 or not self.value.isprintable():
            raise InvalidValue("profileKey", "must be a non-empty printable string")

    def masked(self) -> str:
        return f"{self.value[:4]}…{self.value[-4:]}" if len(self.value) > 8 else "****"

    def __repr__(self) -> str:  # keeps the key out of logs and tracebacks
        return f"ProfileKey({self.masked()})"

    __str__ = __repr__


@dataclass(frozen=True, slots=True)
class IdempotencyKey:
    value: str

    def __post_init__(self) -> None:
        if not _IDEMPOTENCY_PATTERN.fullmatch(self.value):
            raise InvalidValue("Idempotency-Key", "8-128 chars of letters, digits, '-', '_', ':' or '.'")


@dataclass(frozen=True, slots=True)
class PostId:
    value: str

    def __post_init__(self) -> None:
        if not self.value or len(self.value) > 128 or "/" in self.value:
            raise InvalidValue("id", "invalid post id")


@dataclass(frozen=True, slots=True)
class MediaUrl:
    value: str

    def __post_init__(self) -> None:
        parsed = urlparse(self.value)
        if parsed.scheme != "https" or not parsed.netloc:
            raise InvalidValue("media.url", "must be an absolute https URL")

    @property
    def host(self) -> str:
        return urlparse(self.value).hostname or ""


@dataclass(frozen=True, slots=True)
class PhoneNumber:
    """E.164 digits without '+', which is what WhatsApp Cloud API expects."""

    digits: str

    @classmethod
    def parse(cls, raw: str) -> PhoneNumber:
        cleaned = re.sub(r"[\s\-()+]", "", raw)
        return cls(cleaned)

    def __post_init__(self) -> None:
        if not _E164_DIGITS.fullmatch(self.digits):
            raise InvalidValue("recipients", f"'{self.digits}' is not an E.164 phone number")


@dataclass(frozen=True, slots=True)
class Caption:
    text: str

    MAX_ABSOLUTE = 63_206  # Facebook's limit, the largest of all networks

    def __post_init__(self) -> None:
        if len(self.text) > self.MAX_ABSOLUTE:
            raise InvalidValue("caption", f"longer than {self.MAX_ABSOLUTE} characters")

    @property
    def length(self) -> int:
        return len(self.text)

    @property
    def is_empty(self) -> bool:
        return not self.text.strip()

    def hashtag_count(self) -> int:
        return len(_HASHTAG.findall(self.text))

    def mention_count(self) -> int:
        return len(_MENTION.findall(self.text))


@dataclass(frozen=True, slots=True)
class AspectRatio:
    width: int
    height: int

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise InvalidValue("aspectRatio", "width and height must be positive")

    @property
    def value(self) -> float:
        return self.width / self.height

    def label(self) -> str:
        from math import gcd

        divisor = gcd(self.width, self.height)
        return f"{self.width // divisor}:{self.height // divisor}"


@dataclass(frozen=True, slots=True)
class AspectRatioRange:
    """Inclusive range of width/height ratios, with a small tolerance for encoder rounding."""

    minimum: float
    maximum: float
    label: str
    tolerance: float = 0.02

    @classmethod
    def exactly(cls, width: int, height: int) -> AspectRatioRange:
        ratio = width / height
        return cls(ratio, ratio, f"{width}:{height}")

    def contains(self, ratio: AspectRatio) -> bool:
        low = self.minimum * (1 - self.tolerance)
        high = self.maximum * (1 + self.tolerance)
        return low <= ratio.value <= high


VERTICAL_9_16 = AspectRatioRange.exactly(9, 16)
