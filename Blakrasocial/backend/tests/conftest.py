from __future__ import annotations

import pytest

from blakrasocial.domain.enums import Platform
from blakrasocial.domain.validation import default_registry
from blakrasocial.domain.value_objects import ProfileKey
from blakrasocial.infrastructure.idempotency import InMemoryIdempotencyStore
from blakrasocial.infrastructure.security import HmacMediaSigner
from tests.fakes import FakeInspector, FakeMessenger, FakePublisher, FixedClock, account

MEDIA_SECRET = "m" * 40


@pytest.fixture
def profile() -> ProfileKey:
    return ProfileKey("pk_customer_0001")


@pytest.fixture
def clock() -> FixedClock:
    return FixedClock()


@pytest.fixture
def publisher() -> FakePublisher:
    return FakePublisher(
        accounts=[
            account(Platform.INSTAGRAM, "business"),
            account(Platform.FACEBOOK),
            account(Platform.TIKTOK),
            account(Platform.LINKEDIN, "personal"),
            account(Platform.WHATSAPP),
        ]
    )


@pytest.fixture
def messenger() -> FakeMessenger:
    return FakeMessenger()


@pytest.fixture
def inspector() -> FakeInspector:
    return FakeInspector()


@pytest.fixture
def signer(clock: FixedClock) -> HmacMediaSigner:
    return HmacMediaSigner(MEDIA_SECRET, now=clock.now)


@pytest.fixture
def idempotency() -> InMemoryIdempotencyStore:
    return InMemoryIdempotencyStore()


@pytest.fixture
def registry():  # type: ignore[no-untyped-def]
    return default_registry()
