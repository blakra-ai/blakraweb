"""Composition root: the only place that knows which adapter implements which port."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from blakrasocial.application.direct import AccountLinker
from blakrasocial.application.direct.creator_info import GetTikTokCreatorInfo
from blakrasocial.application.errors import NotConfigured
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
from blakrasocial.application.ports.platform_connector import CreatorInfoReader
from blakrasocial.application.ports.repositories import CredentialRepository, ProfileRepository
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
from blakrasocial.application.use_cases.whatsapp_setup import SetupWhatsApp
from blakrasocial.domain.enums import Platform
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
from blakrasocial.infrastructure.worker_runtime import WorkerRuntime


@dataclass
class DirectServices:
    """Direct-mode collaborators the API and the worker need beyond the `SocialPublisher` port."""

    linker: AccountLinker
    profiles: ProfileRepository
    credentials: CredentialRepository
    runtime: WorkerRuntime
    platforms: frozenset[Platform] = frozenset()
    creator_info: CreatorInfoReader | None = None


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
    direct: DirectServices | None = None

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

    @property
    def connectable_platforms(self) -> frozenset[Platform]:
        """Networks a customer can connect from the app (WhatsApp is always set up by an admin)."""
        if self.direct is not None:
            return self.direct.platforms - {Platform.WHATSAPP}
        return frozenset(Platform) - {Platform.WHATSAPP}

    def require_direct(self) -> DirectServices:
        if self.direct is None:
            raise NotConfigured("This endpoint is available only when PUBLISHER=direct.")
        return self.direct

    def tiktok_creator_info(self) -> GetTikTokCreatorInfo:
        direct = self.require_direct()
        if direct.creator_info is None:
            raise NotConfigured("TikTok isn't set up for this service.")
        return GetTikTokCreatorInfo(direct.credentials, direct.creator_info, self.clock)

    def setup_whatsapp(self) -> SetupWhatsApp:
        direct = self.require_direct()
        return SetupWhatsApp(direct.profiles, direct.credentials)

    async def aclose(self) -> None:
        for resource in self.closers:
            close = getattr(resource, "aclose", None) or getattr(resource, "dispose", None)
            if close is not None:
                await close()


def build_container(settings: Settings) -> Container:
    return _build_direct(settings) if settings.publisher == "direct" else _build_ayrshare(settings)


def _shared(settings: Settings, media_http: httpx.AsyncClient) -> dict[str, object]:
    """Adapters that don't depend on how we reach the networks."""
    return {
        "settings": settings,
        "rules": default_registry(),
        "inspector": FfprobeMediaInspector(media_http, settings.ffprobe_path, settings.media_probe_timeout_seconds),
        "signer": HmacMediaSigner(settings.media_signing_secret.get_secret_value()),
        "authenticator": JwtCallerAuthenticator(
            issuer=settings.auth_jwt_issuer,
            audience=settings.auth_jwt_audience,
            algorithms=settings.auth_jwt_algorithms,
            profile_key_claim=settings.auth_profile_key_claim,
            jwks_url=str(settings.auth_jwt_jwks_url) if settings.auth_jwt_jwks_url else None,
            secret=settings.auth_jwt_secret.get_secret_value() if settings.auth_jwt_secret else None,
        ),
        "service_keys": ServiceKeyVerifier(k.get_secret_value() for k in settings.service_api_keys),
        "event_sink": LoggingPublishEventSink(),
    }


def _idempotency(settings: Settings, closers: list[object]) -> IdempotencyStore:
    if settings.redis_url is None:
        return InMemoryIdempotencyStore()
    from redis.asyncio import Redis

    redis = Redis.from_url(settings.redis_url.get_secret_value(), decode_responses=True)
    closers.append(redis)
    return RedisIdempotencyStore(redis)


def _build_direct(settings: Settings) -> Container:
    from blakrasocial.application.direct import (
        AccountLinker,
        DirectSocialPublisher,
        Network,
        NetworkRegistry,
        PostQueue,
        PublishWorker,
        TokenRefresher,
    )
    from blakrasocial.infrastructure.logging import get_logger
    from blakrasocial.infrastructure.networks import linkedin, tiktok
    from blakrasocial.infrastructure.networks.http import MediaSource, NetworkApi
    from blakrasocial.infrastructure.networks.meta import facebook, graph, instagram, whatsapp
    from blakrasocial.infrastructure.persistence import (
        SqlAuthorizationStateRepository,
        SqlCredentialRepository,
        SqlPostRepository,
        SqlProfileRepository,
        create_engine,
        session_factory,
    )
    from blakrasocial.infrastructure.security.aes_cipher import AesGcmCipher
    from blakrasocial.infrastructure.storage import S3ObjectStorage
    from blakrasocial.infrastructure.worker_runtime import AsyncioWorkSignal, WorkerRuntime

    assert settings.database_url and settings.storage_endpoint_url and settings.storage_bucket
    assert settings.storage_access_key_id and settings.storage_secret_access_key and settings.storage_public_base_url

    timeout = httpx.Timeout(settings.http_timeout_seconds, connect=5.0)
    network_http = httpx.AsyncClient(timeout=timeout, limits=httpx.Limits(max_connections=50))
    # Uploads push large files; give them more time per request.
    upload_http = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))
    media_http = httpx.AsyncClient(timeout=timeout)
    engine = create_engine(settings.database_url.get_secret_value())
    closers: list[object] = [network_http, upload_http, media_http, engine]

    clock = SystemClock()
    sessions = session_factory(engine)
    cipher = AesGcmCipher(settings.encryption_keys())
    profiles = SqlProfileRepository(sessions, clock)
    credentials = SqlCredentialRepository(sessions, cipher, clock)
    states = SqlAuthorizationStateRepository(sessions, cipher)
    posts = SqlPostRepository(sessions)

    resilient = ResilientHttpClient(network_http, settings.http_max_retries)
    media = MediaSource(upload_http)
    version = settings.meta_graph_version
    networks: dict[Platform, Network] = {}
    if settings.instagram_app_id and settings.instagram_app_secret:
        api = NetworkApi(resilient, "Instagram", graph.translate)
        networks[Platform.INSTAGRAM] = Network(
            instagram.InstagramOAuth(
                api, settings.instagram_app_id, settings.instagram_app_secret.get_secret_value(), version
            ),
            instagram.InstagramConnector(api, version),
        )
    if settings.facebook_app_id and settings.facebook_app_secret:
        api = NetworkApi(resilient, "Facebook", graph.translate)
        networks[Platform.FACEBOOK] = Network(
            facebook.FacebookOAuth(
                api, settings.facebook_app_id, settings.facebook_app_secret.get_secret_value(), version
            ),
            facebook.FacebookConnector(api, version),
        )
    creator_info: CreatorInfoReader | None = None
    if settings.tiktok_client_key and settings.tiktok_client_secret:
        api = NetworkApi(resilient, "TikTok", tiktok.translate)
        tiktok_connector = tiktok.TikTokConnector(
            NetworkApi(ResilientHttpClient(upload_http, settings.http_max_retries), "TikTok", tiktok.translate),
            media,
        )
        creator_info = tiktok_connector
        networks[Platform.TIKTOK] = Network(
            tiktok.TikTokOAuth(api, settings.tiktok_client_key, settings.tiktok_client_secret.get_secret_value()),
            tiktok_connector,
        )
    if settings.linkedin_client_id and settings.linkedin_client_secret:
        api = NetworkApi(resilient, "LinkedIn", linkedin.translate)
        networks[Platform.LINKEDIN] = Network(
            linkedin.LinkedInOAuth(
                api, settings.linkedin_client_id, settings.linkedin_client_secret.get_secret_value()
            ),
            linkedin.LinkedInConnector(
                NetworkApi(ResilientHttpClient(upload_http, settings.http_max_retries), "LinkedIn", linkedin.translate),
                media,
                settings.linkedin_version(),
            ),
        )
    registry = NetworkRegistry(networks)

    signal = AsyncioWorkSignal()
    linker = AccountLinker(registry, profiles, credentials, states, clock, settings.oauth_callback_base)
    queue = PostQueue(posts, credentials, registry, clock, signal)
    storage = S3ObjectStorage(
        endpoint_url=str(settings.storage_endpoint_url),
        bucket=settings.storage_bucket,
        region=settings.storage_region,
        access_key_id=settings.storage_access_key_id.get_secret_value(),
        secret_access_key=settings.storage_secret_access_key.get_secret_value(),
        public_base_url=str(settings.storage_public_base_url),
    )
    runtime = WorkerRuntime(
        PublishWorker(posts, credentials, registry, clock, logger=get_logger("worker")),
        TokenRefresher(credentials, registry, clock),
        signal,
        settings.worker_poll_seconds,
    )
    return Container(
        **_shared(settings, media_http),  # type: ignore[arg-type]
        publisher=DirectSocialPublisher(profiles, linker, queue, storage),
        messenger=whatsapp.CloudApiMessenger(NetworkApi(resilient, "WhatsApp", graph.translate), credentials, version),
        idempotency=_idempotency(settings, closers),
        clock=clock,
        webhook_verifier=AyrshareWebhookVerifier(None, settings.webhook_max_age_seconds),  # no inbound webhooks
        webhook_parser=AyrshareWebhookParser(),
        closers=closers,
        direct=DirectServices(
            linker=linker,
            profiles=profiles,
            credentials=credentials,
            runtime=runtime,
            platforms=registry.platforms,
            creator_info=creator_info,
        ),
    )


def _build_ayrshare(settings: Settings) -> Container:
    assert settings.ayrshare_api_key is not None
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
    return Container(
        **_shared(settings, media_http),  # type: ignore[arg-type]
        publisher=AyrsharePublisher(
            ayrshare,
            link_domain=settings.ayrshare_link_domain,
            instagram_link_method=settings.ayrshare_instagram_link_method,
            webhook_url=str(settings.public_webhook_url) if settings.public_webhook_url else None,
            webhook_secret=webhook_secret,
            messaging_enabled=settings.ayrshare_messaging_enabled,
        ),
        messenger=AyrshareWhatsAppMessenger(ayrshare),
        idempotency=_idempotency(settings, closers),
        clock=SystemClock(),
        webhook_verifier=AyrshareWebhookVerifier(webhook_secret, settings.webhook_max_age_seconds),
        webhook_parser=AyrshareWebhookParser(),
        closers=closers,
    )
