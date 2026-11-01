"""A production deployment must not start with the public example secrets from .env.example."""

import base64
import secrets

import pytest
from pydantic import ValidationError

from blakrasocial.infrastructure.settings import Settings

PROD = {
    "_env_file": None,
    "ENVIRONMENT": "production",
    "PUBLISHER": "direct",
    "DATABASE_URL": "postgresql+asyncpg://u:p@db/x",
    "PUBLIC_API_BASE_URL": "https://social.example.com/api",
    "PUBLIC_APP_URL": "https://social.example.com",
    "CORS_ALLOWED_ORIGINS": "https://social.example.com",
    "STORAGE_ENDPOINT_URL": "https://acc.r2.cloudflarestorage.com",
    "STORAGE_BUCKET": "media",
    "STORAGE_ACCESS_KEY_ID": "k",
    "STORAGE_SECRET_ACCESS_KEY": "s",
    "STORAGE_PUBLIC_BASE_URL": "https://media.example.com",
}


def _real() -> dict[str, str]:
    return {
        "CREDENTIALS_ENCRYPTION_KEYS": f"k1:{base64.b64encode(secrets.token_bytes(32)).decode()}",
        "SESSION_SECRET": secrets.token_urlsafe(40),
        "MEDIA_SIGNING_SECRET": secrets.token_urlsafe(40),
        "SERVICE_API_KEYS": secrets.token_urlsafe(40),
    }


def _build(monkeypatch: pytest.MonkeyPatch, values: dict[str, str]) -> Settings:
    for key, value in {**{k: v for k, v in PROD.items() if k != "_env_file"}, **values}.items():
        monkeypatch.setenv(key, value)
    return Settings(_env_file=None)  # type: ignore[call-arg]


def test_real_secrets_are_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    assert _build(monkeypatch, _real()).environment == "production"


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("SESSION_SECRET", "dev-only-session-secret-change-me-0000000"),
        ("MEDIA_SIGNING_SECRET", "dev-only-media-secret-change-me-00000000"),
        ("CREDENTIALS_ENCRYPTION_KEYS", "dev:ZGV2LW9ubHkta2V5LW5ldmVyLXVzZS1pbi1wcm9kISE="),
    ],
)
def test_example_secrets_are_refused(monkeypatch: pytest.MonkeyPatch, name: str, value: str) -> None:
    with pytest.raises(ValidationError, match=name):
        _build(monkeypatch, {**_real(), name: value})
