"""Composition root: the only place that knows which adapter implements which port."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import httpx

from blakrasocial.application.accounts.deletion import DeleteAccount
from blakrasocial.application.accounts.service import (
    AcceptInvite,
    AccountPolicy,
    BootstrapAdmin,
    ChangePassword,
    CurrentUser,
    InspectInvite,
    Invitations,
    ManageCustomers,
    RefreshAccess,
    SignIn,
    SignOut,
)
from blakrasocial.application.accounts.service import Sessions as AccountSessions
from blakrasocial.application.direct import AccountLinker
from blakrasocial.application.direct.creator_info import GetTikTokCreatorInfo
from blakrasocial.application.direct.data_deletion import ForgetNetworkUser, GetDeletionReceipt
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
from blakrasocial.application.ports.accounts import (
    AccessTokenIssuer,
    InviteRepository,
    LoginThrottle,
    PasswordHasher,
    SessionRepository,
    UserRepository,
)
from blakrasocial.application.ports.direct_messenger import WhatsAppNumberVerifier
from blakrasocial.application.ports.object_storage import ObjectStorage
from blakrasocial.application.ports.platform_connector import CreatorInfoReader
from blakrasocial.application.ports.repositories import (
    CredentialRepository,
    DeletionReceiptRepository,
    ProfileRepository,
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
from blakrasocial.infrastructure.networks.meta.signed_request import SignedRequestVerifier
from blakrasocial.infrastructure.security import (
    HmacMediaSigner,
    JwtCallerAuthenticator,
    ServiceKeyVerifier,
)
from blakrasocial.infrastructure.settings import Settings
from blakrasocial.infrastructure.worker_runtime import WorkerRuntime

if TYPE_CHECKING:
    from blakrasocial.application.direct import NetworkRegistry
    from blakrasocial.infrastructure.networks.http import MediaSource


@dataclass
class DirectServices:
    """Direct-mode collaborators the API and the worker need beyond the `SocialPublisher` port."""

    linker: AccountLinker
    profiles: ProfileRepository
    credentials: CredentialRepository
    runtime: WorkerRuntime
    platforms: frozenset[Platform] = frozenset()
    creator_info: CreatorInfoReader | None = None
    receipts: DeletionReceiptRepository | None = None
    signed_requests: dict[Platform, SignedRequestVerifier] = field(default_factory=dict)
    storage: ObjectStorage | None = None
    whatsapp_verifier: WhatsAppNumberVerifier | None = None


@dataclass
class AccountServices:
    """Built-in sign-in (direct mode only, it needs the database)."""

    users: UserRepository
    sessions: SessionRepository
    invites: InviteRepository
    hasher: PasswordHasher
    throttle: LoginThrottle
    issuer: AccessTokenIssuer
    policy: AccountPolicy = field(default_factory=AccountPolicy)


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
    accounts: AccountServices | None = None

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

    # ---- built-in accounts ----
    def require_accounts(self) -> AccountServices:
        if self.accounts is None:
            raise NotConfigured("Built-in sign-in is available only when PUBLISHER=direct.")
        return self.accounts

    def _starter(self) -> AccountSessions:
        a = self.require_accounts()
        return AccountSessions(a.sessions, a.issuer, self.clock, a.policy)

    def sign_in(self) -> SignIn:
        a = self.require_accounts()
        return SignIn(a.users, a.hasher, a.throttle, self._starter(), self.clock)

    def refresh_access(self) -> RefreshAccess:
        a = self.require_accounts()
        return RefreshAccess(a.users, a.sessions, self._starter(), self.clock)

    def sign_out(self) -> SignOut:
        return SignOut(self.require_accounts().sessions)

    def current_user(self) -> CurrentUser:
        return CurrentUser(self.require_accounts().users)

    def inspect_invite(self) -> InspectInvite:
        a = self.require_accounts()
        return InspectInvite(a.invites, a.users, self.clock)

    def accept_invite(self) -> AcceptInvite:
        a = self.require_accounts()
        return AcceptInvite(a.invites, a.users, a.sessions, a.hasher, self._starter(), self.clock)

    def change_password(self) -> ChangePassword:
        a = self.require_accounts()
        return ChangePassword(a.users, a.sessions, a.hasher, self._starter())

    def manage_customers(self) -> ManageCustomers:
        a = self.require_accounts()
        return ManageCustomers(
            a.users, a.sessions, self.publisher, Invitations(a.invites, self.clock, a.policy), self.clock
        )

    def bootstrap_admin(self) -> BootstrapAdmin:
        return BootstrapAdmin(self.require_accounts().users, self.manage_customers())

    def tiktok_creator_info(self) -> GetTikTokCreatorInfo:
        direct = self.require_direct()
        if direct.creator_info is None:
            raise NotConfigured("TikTok isn't set up for this service.")
        return GetTikTokCreatorInfo(direct.credentials, direct.creator_info, self.clock)

    def meta_signed_requests(self, platform: Platform) -> SignedRequestVerifier:
        verifier = self.require_direct().signed_requests.get(platform)
        if verifier is None:
            raise NotConfigured(f"{platform.value.title()} isn't set up for this service.")
        return verifier

    def forget_network_user(self) -> ForgetNetworkUser:
        direct = self.require_direct()
        assert direct.receipts is not None
        return ForgetNetworkUser(direct.credentials, direct.receipts, self.clock)

    def deletion_receipt(self) -> GetDeletionReceipt:
        direct = self.require_direct()
        assert direct.receipts is not None
        return GetDeletionReceipt(direct.receipts)

    def setup_whatsapp(self) -> SetupWhatsApp:
        direct = self.require_direct()
        return SetupWhatsApp(direct.profiles, direct.credentials, direct.whatsapp_verifier)

    def delete_account(self) -> DeleteAccount:
        a = self.require_accounts()
        direct = self.require_direct()
        if direct.storage is None:
            raise RuntimeError("Storage is not configured.")
        return DeleteAccount(a.users, a.sessions, direct.profiles, direct.storage)

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
        "authenticator": _authenticator(settings),
        "service_keys": ServiceKeyVerifier(k.get_secret_value() for k in settings.service_api_keys),
        "event_sink": LoggingPublishEventSink(),
    }


def _authenticator(settings: Settings) -> CallerAuthenticator:
    from blakrasocial.infrastructure.accounts import BuiltinTokenAuthenticator, CompositeAuthenticator

    external = (
        JwtCallerAuthenticator(
            issuer=settings.auth_jwt_issuer,
            audience=settings.auth_jwt_audience,
            algorithms=settings.auth_jwt_algorithms,
            profile_key_claim=settings.auth_profile_key_claim,
            jwks_url=str(settings.auth_jwt_jwks_url) if settings.auth_jwt_jwks_url else None,
            secret=settings.auth_jwt_secret.get_secret_value() if settings.auth_jwt_secret else None,
        )
        if settings.external_auth_enabled
        else None
    )
    builtin = BuiltinTokenAuthenticator(settings.session_secret.get_secret_value()) if settings.session_secret else None
    return CompositeAuthenticator(builtin, external)


def _accounts(settings: Settings, sessions: object, cipher: object, closers: list[object]) -> AccountServices:
    from blakrasocial.infrastructure.accounts import (
        Argon2PasswordHasher,
        InMemoryLoginThrottle,
        JwtAccessTokenIssuer,
        RedisLoginThrottle,
    )
    from blakrasocial.infrastructure.persistence import SqlInviteRepository, SqlSessionRepository, SqlUserRepository

    assert settings.session_secret is not None
    throttle: LoginThrottle
    if settings.redis_url:
        from redis.asyncio import Redis

        redis = Redis.from_url(settings.redis_url.get_secret_value())
        closers.append(redis)
        throttle = RedisLoginThrottle(redis)
    else:
        throttle = InMemoryLoginThrottle()
    return AccountServices(
        users=SqlUserRepository(sessions, cipher),  # type: ignore[arg-type]
        sessions=SqlSessionRepository(sessions),  # type: ignore[arg-type]
        invites=SqlInviteRepository(sessions),  # type: ignore[arg-type]
        hasher=Argon2PasswordHasher(),
        throttle=throttle,
        issuer=JwtAccessTokenIssuer(settings.session_secret.get_secret_value()),
    )


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
        PostQueue,
        PublishWorker,
        TokenRefresher,
    )
    from blakrasocial.infrastructure.logging import get_logger
    from blakrasocial.infrastructure.networks.http import MediaSource, NetworkApi
    from blakrasocial.infrastructure.networks.meta import graph, whatsapp
    from blakrasocial.infrastructure.persistence import (
        SqlAuthorizationStateRepository,
        SqlCredentialRepository,
        SqlDeletionReceiptRepository,
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
    registry, signed_requests, creator_info = _build_networks(settings, resilient, upload_http, media)

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
        messenger=whatsapp.CloudApiMessenger(
            NetworkApi(resilient, "WhatsApp", graph.translate), credentials, settings.meta_graph_version
        ),
        idempotency=_idempotency(settings, closers),
        clock=clock,
        webhook_verifier=AyrshareWebhookVerifier(None, settings.webhook_max_age_seconds),  # no inbound webhooks
        webhook_parser=AyrshareWebhookParser(),
        closers=closers,
        accounts=_accounts(settings, sessions, cipher, closers),
        direct=DirectServices(
            linker=linker,
            profiles=profiles,
            credentials=credentials,
            runtime=runtime,
            platforms=registry.platforms,
            creator_info=creator_info,
            receipts=SqlDeletionReceiptRepository(sessions),
            signed_requests=signed_requests,
            storage=storage,
            whatsapp_verifier=whatsapp.CloudApiNumberVerifier(
                NetworkApi(resilient, "WhatsApp", graph.translate), settings.meta_graph_version
            ),
        ),
    )


def _build_networks(
    settings: Settings, resilient: ResilientHttpClient, upload_http: httpx.AsyncClient, media: MediaSource
) -> tuple[NetworkRegistry, dict[Platform, SignedRequestVerifier], CreatorInfoReader | None]:
    """One entry per network whose app id/secret is configured (others stay hidden in the app)."""
    from blakrasocial.application.direct import Network, NetworkRegistry
    from blakrasocial.infrastructure.networks import linkedin, tiktok
    from blakrasocial.infrastructure.networks.http import NetworkApi
    from blakrasocial.infrastructure.networks.meta import facebook, graph, instagram

    version = settings.meta_graph_version
    networks: dict[Platform, Network] = {}
    signed_requests: dict[Platform, SignedRequestVerifier] = {}
    if settings.instagram_app_id and settings.instagram_app_secret:
        api = NetworkApi(resilient, "Instagram", graph.translate)
        networks[Platform.INSTAGRAM] = Network(
            instagram.InstagramOAuth(
                api, settings.instagram_app_id, settings.instagram_app_secret.get_secret_value(), version
            ),
            instagram.InstagramConnector(api, version),
        )
        signed_requests[Platform.INSTAGRAM] = SignedRequestVerifier(settings.instagram_app_secret.get_secret_value())
    if settings.facebook_app_id and settings.facebook_app_secret:
        api = NetworkApi(resilient, "Facebook", graph.translate)
        networks[Platform.FACEBOOK] = Network(
            facebook.FacebookOAuth(
                api, settings.facebook_app_id, settings.facebook_app_secret.get_secret_value(), version
            ),
            facebook.FacebookConnector(api, version),
        )
        signed_requests[Platform.FACEBOOK] = SignedRequestVerifier(settings.facebook_app_secret.get_secret_value())
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
    return NetworkRegistry(networks), signed_requests, creator_info


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
