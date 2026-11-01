"""Composition root: the only place that knows which adapter implements which port."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from blakrasocial.application.ports import (
    CallerAuthenticator,
    Clock,
    DirectMessenger,
    IdempotencyStore,
    MediaInspector,
    MediaReferenceSigner,
    PublishEventSink,
    SocialPublisher,
    WebhookEventParser,
    WebhookSignatureVerifier,
)
from blakrasocial.application.use_cases import (
    ConnectAccount,
    CreateProfile,
    DeletePost,
    GetPostStatus,
    HandlePublishWebhook,
    ListAccounts,
    ListPosts,
    PublishPost,
    SchedulePost,
    UnlinkAccount,
    UploadMedia,
)
from blakrasocial.domain.validation import PlatformRuleRegistry, default_registry
from blakrasocial.infrastructure.ayrshare import (
    AyrsharePublisher,
    AyrshareWebhookParser,
    AyrshareWebhookVerifier,
    AyrshareWhatsAppMessenger,
)
from blakrasocial.infrastructure.ayrshare.client import AyrshareClient
from blakrasocial.infrastructure.clock import SystemClock
from blakrasocial.infrastructure.event_sink import LoggingPublishEventSink
from blakrasocial.infrastructure.http.resilient_client import ResilientHttpClient
from blakrasocial.infrastructure.idempotency import InMemoryIdempotencyStore, RedisIdempotencyStore
from blakrasocial.infrastructure.media import FfprobeMediaInspector
from blakrasocial.infrastructure.security import (
    HmacMediaSigner,
    JwtCallerAuthenticator,
    ServiceKeyVerifier,
)
from blakrasocial.infrastructure.settings import Settings


@dataclass
class Container:
    settings: Settings
    publisher: SocialPublisher
    messenger: DirectMessenger
    rules: PlatformRuleRegistry
    inspector: MediaInspector
    signer: MediaReferenceSigner
    idempotency: IdempotencyStore
    clock: Clock
    authenticator: CallerAuthenticator
    service_keys: ServiceKeyVerifier
    webhook_verifier: WebhookSignatureVerifier
    webhook_parser: WebhookEventParser
    event_sink: PublishEventSink
    closers: list[object] = field(default_factory=list)

    # ---- use case factories (cheap objects, built per request) ----

    def create_profile(self) -> CreateProfile:
        return CreateProfile(self.publisher)

    def connect_account(self) -> ConnectAccount:
        return ConnectAccount(self.publisher, self.settings.allowed_origins)

    def list_accounts(self) -> ListAccounts:
        return ListAccounts(self.publisher)

    def unlink_account(self) -> UnlinkAccount:
        return UnlinkAccount(self.publisher)

    def upload_media(self) -> UploadMedia:
        return UploadMedia(self.publisher, self.signer, self.clock)

    def publish_post(self) -> PublishPost:
        return PublishPost(
            self.publisher,
            self.messenger,
            self.rules,
            self.inspector,
            self.signer,
            self.idempotency,
            self.clock,
        )

    def schedule_post(self) -> SchedulePost:
        return SchedulePost(self.publish_post())

    def list_posts(self) -> ListPosts:
        return ListPosts(self.publisher)

    def get_post_status(self) -> GetPostStatus:
        return GetPostStatus(self.publisher)

    def delete_post(self) -> DeletePost:
        return DeletePost(self.publisher)

    def handle_webhook(self) -> HandlePublishWebhook:
        return HandlePublishWebhook(self.webhook_verifier, self.webhook_parser, self.event_sink)

    async def aclose(self) -> None:
        for resource in self.closers:
            close = getattr(resource, "aclose", None)
            if close is not None:
                await close()


def build_container(settings: Settings) -> Container:
    timeout = httpx.Timeout(settings.http_timeout_seconds, connect=5.0)
    provider_http = httpx.AsyncClient(
        timeout=timeout, limits=httpx.Limits(max_connections=50, max_keepalive_connections=20)
    )
    media_http = httpx.AsyncClient(timeout=timeout)
    ayrshare = AyrshareClient(
        ResilientHttpClient(provider_http, settings.http_max_retries),
        str(settings.ayrshare_base_url),
        settings.ayrshare_api_key.get_secret_value(),
    )
    webhook_secret = settings.ayrshare_webhook_secret.get_secret_value() if settings.ayrshare_webhook_secret else None

    closers: list[object] = [provider_http, media_http]
    idempotency: IdempotencyStore
    if settings.redis_url is not None:
        from redis.asyncio import Redis

        redis = Redis.from_url(settings.redis_url.get_secret_value(), decode_responses=True)
        idempotency = RedisIdempotencyStore(redis)
        closers.append(redis)
    else:
        idempotency = InMemoryIdempotencyStore()

    return Container(
        settings=settings,
        publisher=AyrsharePublisher(
            ayrshare,
            link_domain=settings.ayrshare_link_domain,
            instagram_link_method=settings.ayrshare_instagram_link_method,
            webhook_url=str(settings.public_webhook_url) if settings.public_webhook_url else None,
            webhook_secret=webhook_secret,
            messaging_enabled=settings.ayrshare_messaging_enabled,
        ),
        messenger=AyrshareWhatsAppMessenger(ayrshare),
        rules=default_registry(),
        inspector=FfprobeMediaInspector(media_http, settings.ffprobe_path, settings.media_probe_timeout_seconds),
        signer=HmacMediaSigner(settings.media_signing_secret.get_secret_value()),
        idempotency=idempotency,
        clock=SystemClock(),
        authenticator=JwtCallerAuthenticator(
            issuer=settings.auth_jwt_issuer,
            audience=settings.auth_jwt_audience,
            algorithms=settings.auth_jwt_algorithms,
            profile_key_claim=settings.auth_profile_key_claim,
            jwks_url=str(settings.auth_jwt_jwks_url) if settings.auth_jwt_jwks_url else None,
            secret=settings.auth_jwt_secret.get_secret_value() if settings.auth_jwt_secret else None,
        ),
        service_keys=ServiceKeyVerifier(k.get_secret_value() for k in settings.service_api_keys),
        webhook_verifier=AyrshareWebhookVerifier(webhook_secret, settings.webhook_max_age_seconds),
        webhook_parser=AyrshareWebhookParser(),
        event_sink=LoggingPublishEventSink(),
        closers=closers,
    )
