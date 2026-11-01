from __future__ import annotations

import base64
import binascii
from datetime import UTC, date, datetime
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (or a local .env in development)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True)

    environment: Literal["development", "test", "production"] = "production"
    log_level: str = "INFO"

    # --- Which adapter implements SocialPublisher ---
    # direct: our own OAuth + official network APIs (free, needs DB/storage/app approvals)
    # ayrshare: Ayrshare Business (paid, no approvals)
    publisher: Literal["direct", "ayrshare"] = "direct"

    # --- Ayrshare (secrets never leave the backend) ---
    ayrshare_api_key: SecretStr | None = None
    ayrshare_base_url: HttpUrl = HttpUrl("https://api.ayrshare.com/api")
    ayrshare_link_domain: str | None = None
    ayrshare_instagram_link_method: Literal["facebook", "instagram"] = "facebook"
    ayrshare_webhook_secret: SecretStr | None = None
    ayrshare_messaging_enabled: bool = False
    public_webhook_url: HttpUrl | None = None

    # --- Direct mode: persistence, token encryption, storage ---
    public_api_base_url: HttpUrl | None = None  # where networks redirect after OAuth: <base>/oauth/<platform>/callback
    database_url: SecretStr | None = None  # postgresql+asyncpg://user:pass@host/db
    credentials_encryption_keys: Annotated[list[SecretStr], NoDecode] = Field(default_factory=list)  # kid:base64(32B)
    storage_endpoint_url: HttpUrl | None = None  # S3-compatible: Cloudflare R2, MinIO, AWS S3
    storage_bucket: str | None = None
    storage_region: str = "auto"
    storage_access_key_id: SecretStr | None = None
    storage_secret_access_key: SecretStr | None = None
    storage_public_base_url: HttpUrl | None = None  # public URL networks download from
    run_worker_in_api: bool = False
    worker_poll_seconds: float = 15.0

    # --- Direct mode: network apps (a network is enabled when its id + secret are set) ---
    meta_graph_version: str = "v26.0"
    facebook_app_id: str | None = None
    facebook_app_secret: SecretStr | None = None
    instagram_app_id: str | None = None
    instagram_app_secret: SecretStr | None = None
    tiktok_client_key: str | None = None
    tiktok_client_secret: SecretStr | None = None
    linkedin_client_id: str | None = None
    linkedin_client_secret: SecretStr | None = None
    # LinkedIn retires each monthly API version after about a year. Empty = use the version from
    # two months ago, which always exists and never ages out. Pin a YYYYMM value only to debug.
    linkedin_api_version: str = Field("", pattern=r"^(\d{6})?$")

    # --- Caller authentication (tokens issued by the host platform) ---
    auth_jwt_jwks_url: HttpUrl | None = None
    auth_jwt_secret: SecretStr | None = None
    auth_jwt_algorithms: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["RS256"])
    auth_jwt_issuer: str
    auth_jwt_audience: str
    auth_profile_key_claim: str = "profile_key"
    service_api_keys: Annotated[list[SecretStr], NoDecode] = Field(default_factory=list)

    # --- Media ---
    media_signing_secret: SecretStr
    ffprobe_path: str = "ffprobe"
    media_probe_timeout_seconds: float = 30.0

    # --- Web ---
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    webhook_max_age_seconds: int = 300

    # --- Infrastructure ---
    redis_url: SecretStr | None = None
    http_timeout_seconds: float = 20.0
    http_max_retries: int = 3

    @field_validator("auth_jwt_algorithms", "cors_allowed_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("service_api_keys", "credentials_encryption_keys", mode="before")
    @classmethod
    def _split_secret_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [SecretStr(item.strip()) for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def _check_security(self) -> Settings:
        if bool(self.auth_jwt_jwks_url) == bool(self.auth_jwt_secret):
            raise ValueError("Set exactly one of AUTH_JWT_JWKS_URL or AUTH_JWT_SECRET")
        if self.auth_jwt_secret and len(self.auth_jwt_secret.get_secret_value()) < 32:
            raise ValueError("AUTH_JWT_SECRET must be at least 32 characters")
        if self.auth_jwt_secret and any(not a.startswith("HS") for a in self.auth_jwt_algorithms):
            raise ValueError("AUTH_JWT_SECRET requires HS* algorithms")
        if self.auth_jwt_jwks_url and any(a.startswith("HS") or a == "none" for a in self.auth_jwt_algorithms):
            raise ValueError("AUTH_JWT_JWKS_URL requires asymmetric algorithms (RS*/ES*/PS*/EdDSA)")
        if len(self.media_signing_secret.get_secret_value()) < 32:
            raise ValueError("MEDIA_SIGNING_SECRET must be at least 32 characters")
        if any(len(k.get_secret_value()) < 32 for k in self.service_api_keys):
            raise ValueError("Each SERVICE_API_KEYS entry must be at least 32 characters")
        if self.publisher == "ayrshare" and not self.ayrshare_api_key:
            raise ValueError("PUBLISHER=ayrshare requires AYRSHARE_API_KEY")
        if self.publisher == "direct":
            self._check_direct_mode()
        if self.public_webhook_url and not self.ayrshare_webhook_secret:
            raise ValueError("PUBLIC_WEBHOOK_URL requires AYRSHARE_WEBHOOK_SECRET")
        if self.environment == "production" and "*" in self.cors_allowed_origins:
            raise ValueError("CORS wildcard is not allowed in production")
        return self

    def _check_direct_mode(self) -> None:
        missing = [
            name
            for name, value in (
                ("DATABASE_URL", self.database_url),
                ("PUBLIC_API_BASE_URL", self.public_api_base_url),
                ("CREDENTIALS_ENCRYPTION_KEYS", self.credentials_encryption_keys),
                ("STORAGE_ENDPOINT_URL", self.storage_endpoint_url),
                ("STORAGE_BUCKET", self.storage_bucket),
                ("STORAGE_ACCESS_KEY_ID", self.storage_access_key_id),
                ("STORAGE_SECRET_ACCESS_KEY", self.storage_secret_access_key),
                ("STORAGE_PUBLIC_BASE_URL", self.storage_public_base_url),
            )
            if not value
        ]
        if missing:
            raise ValueError(f"PUBLISHER=direct requires {', '.join(missing)}")
        self.encryption_keys()  # validates format
        for app_id, secret, label in (
            (self.facebook_app_id, self.facebook_app_secret, "FACEBOOK_APP"),
            (self.instagram_app_id, self.instagram_app_secret, "INSTAGRAM_APP"),
            (self.tiktok_client_key, self.tiktok_client_secret, "TIKTOK_CLIENT"),
            (self.linkedin_client_id, self.linkedin_client_secret, "LINKEDIN_CLIENT"),
        ):
            if bool(app_id) != bool(secret):
                raise ValueError(f"Set both the id and the secret for {label} (or neither)")
        if self.environment == "production" and self.public_api_base_url and self.public_api_base_url.scheme != "https":
            raise ValueError("PUBLIC_API_BASE_URL must use https in production")

    def linkedin_version(self, today: date | None = None) -> str:
        if self.linkedin_api_version:
            return self.linkedin_api_version
        day = today or datetime.now(UTC).date()
        months = day.year * 12 + day.month - 1 - 2
        return f"{months // 12}{months % 12 + 1:02d}"

    def encryption_keys(self) -> list[tuple[str, bytes]]:
        """`kid:base64key` entries; the first one encrypts, all of them decrypt (key rotation)."""
        keys: list[tuple[str, bytes]] = []
        for entry in self.credentials_encryption_keys:
            kid, sep, encoded = entry.get_secret_value().partition(":")
            try:
                key = base64.b64decode(encoded, validate=True) if sep else b""
            except (binascii.Error, ValueError):
                key = b""
            if not kid or len(key) != 32:
                raise ValueError("Each CREDENTIALS_ENCRYPTION_KEYS entry must be 'id:<base64 of 32 random bytes>'")
            keys.append((kid, key))
        return keys

    @property
    def oauth_callback_base(self) -> str:
        return str(self.public_api_base_url).rstrip("/") if self.public_api_base_url else ""

    @property
    def allowed_origins(self) -> frozenset[str]:
        return frozenset(o.rstrip("/") for o in self.cors_allowed_origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # values come from the environment
