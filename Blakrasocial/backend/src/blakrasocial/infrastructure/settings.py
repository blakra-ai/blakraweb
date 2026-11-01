from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (or a local .env in development)."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True
    )

    environment: Literal["development", "test", "production"] = "production"
    log_level: str = "INFO"

    # --- Ayrshare (secrets never leave the backend) ---
    ayrshare_api_key: SecretStr
    ayrshare_base_url: HttpUrl = HttpUrl("https://api.ayrshare.com/api")
    ayrshare_link_domain: str | None = None
    ayrshare_instagram_link_method: Literal["facebook", "instagram"] = "facebook"
    ayrshare_webhook_secret: SecretStr | None = None
    ayrshare_messaging_enabled: bool = False
    public_webhook_url: HttpUrl | None = None

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

    @field_validator("service_api_keys", mode="before")
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
        if self.public_webhook_url and not self.ayrshare_webhook_secret:
            raise ValueError("PUBLIC_WEBHOOK_URL requires AYRSHARE_WEBHOOK_SECRET")
        if self.environment == "production" and "*" in self.cors_allowed_origins:
            raise ValueError("CORS wildcard is not allowed in production")
        return self

    @property
    def allowed_origins(self) -> frozenset[str]:
        return frozenset(o.rstrip("/") for o in self.cors_allowed_origins)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # values come from the environment
