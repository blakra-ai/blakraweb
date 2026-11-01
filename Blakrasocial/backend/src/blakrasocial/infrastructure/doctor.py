"""`python -m blakrasocial.cli doctor`: checks a deployment end to end and says, in plain words, what
to fix. Safe to run any time: it writes one tiny test file to storage and deletes it again."""

from __future__ import annotations

import secrets
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import StrEnum

import httpx

from blakrasocial.infrastructure.settings import Settings


class Status(StrEnum):
    OK = "ok"
    WARN = "warn"
    FAIL = "fail"


@dataclass(frozen=True, slots=True)
class Check:
    name: str
    status: Status
    detail: str
    fix: str = ""


Probe = Callable[[], Awaitable[Check]]


class Doctor:
    def __init__(self, settings: Settings, http: httpx.AsyncClient) -> None:
        self._s = settings
        self._http = http

    async def run(self) -> list[Check]:
        probes: list[Probe] = [self.database, self.encryption, self.storage, self.public_api, self.admin]
        probes += [self.facebook, self.instagram, self.tiktok, self.linkedin]
        results: list[Check] = []
        for probe in probes:
            try:
                results.append(await probe())
            except Exception as exc:
                results.append(Check(probe.__name__, Status.FAIL, f"{type(exc).__name__}: {exc}"))
        return results

    def callback_urls(self) -> dict[str, str]:
        base = self._s.oauth_callback_base
        urls = {f"{n} OAuth redirect URI": f"{base}/oauth/{n.lower()}/callback" for n in self._configured()}
        for network in ("Facebook", "Instagram"):
            if network in self._configured():
                urls[f"{network} deauthorize callback"] = f"{base}/meta/{network.lower()}/deauthorize"
                urls[f"{network} data deletion request URL"] = f"{base}/meta/{network.lower()}/data-deletion"
        return urls

    def _configured(self) -> list[str]:
        s = self._s
        pairs = (
            ("Instagram", s.instagram_app_id),
            ("Facebook", s.facebook_app_id),
            ("TikTok", s.tiktok_client_key),
            ("LinkedIn", s.linkedin_client_id),
        )
        return [name for name, value in pairs if value]

    # ---------------------------------------------------------------- platform
    async def database(self) -> Check:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        from sqlalchemy import text

        from blakrasocial.infrastructure.persistence import create_engine

        assert self._s.database_url is not None
        engine = create_engine(self._s.database_url.get_secret_value())
        try:
            async with engine.connect() as conn:
                current = (await conn.execute(text("SELECT version_num FROM alembic_version"))).scalar()
        finally:
            await engine.dispose()
        from pathlib import Path

        config = Config()
        config.set_main_option("script_location", str(Path(__file__).parent / "persistence" / "migrations"))
        head = ScriptDirectory.from_config(config).get_current_head()
        if current != head:
            return Check("Database", Status.FAIL, f"schema {current}, latest {head}", "Run: alembic upgrade head")
        return Check("Database", Status.OK, f"connected, schema up to date ({head})")

    async def encryption(self) -> Check:
        from blakrasocial.infrastructure.security.aes_cipher import AesGcmCipher

        cipher = AesGcmCipher(self._s.encryption_keys())
        assert cipher.decrypt(cipher.encrypt("probe", context="doctor"), context="doctor") == "probe"
        kid = self._s.encryption_keys()[0][0]
        warn = kid == "dev" and self._s.environment == "production"
        return Check(
            "Token encryption",
            Status.FAIL if warn else Status.OK,
            f"active key '{kid}'",
            "Generate a real key (see .env.example) — the dev key is public." if warn else "",
        )

    async def storage(self) -> Check:
        from blakrasocial.infrastructure.storage import S3ObjectStorage

        s = self._s
        assert s.storage_endpoint_url and s.storage_bucket and s.storage_public_base_url
        assert s.storage_access_key_id and s.storage_secret_access_key
        storage = S3ObjectStorage(
            endpoint_url=str(s.storage_endpoint_url),
            bucket=s.storage_bucket,
            region=s.storage_region,
            access_key_id=s.storage_access_key_id.get_secret_value(),
            secret_access_key=s.storage_secret_access_key.get_secret_value(),
            public_base_url=str(s.storage_public_base_url),
        )
        key = f"u/doctor/{secrets.token_hex(8)}.txt"
        body = b"blakrasocial storage check"
        ticket = await storage.presign_upload(key, "text/plain", len(body))
        put = await self._http.put(ticket.upload_url, content=body, headers={"Content-Type": "text/plain"})
        if put.status_code >= 300:
            return Check("Storage", Status.FAIL, f"upload refused ({put.status_code})", "Check STORAGE_* keys/bucket.")
        try:
            got = await self._http.get(ticket.access_url)
            if got.status_code != 200 or got.content != body:
                return Check(
                    "Storage",
                    Status.FAIL,
                    f"uploaded, but the public URL answered {got.status_code}",
                    "Turn on public access for the bucket and set STORAGE_PUBLIC_BASE_URL to that address.",
                )
            if not ticket.access_url.startswith("https://"):
                return Check("Storage", Status.WARN, "works, but public URL isn't https", "Networks require https.")
            origin = s.app_base
            if origin:
                pre = await self._http.options(
                    ticket.upload_url,
                    headers={
                        "Origin": origin,
                        "Access-Control-Request-Method": "PUT",
                        "Access-Control-Request-Headers": "content-type",
                    },
                )
                if pre.headers.get("access-control-allow-origin") not in (origin, "*"):
                    return Check(
                        "Storage",
                        Status.FAIL,
                        "browser uploads would be blocked (CORS)",
                        f"Add a CORS rule allowing PUT from {origin} with header content-type (see the guide).",
                    )
            return Check("Storage", Status.OK, "upload, public read and browser CORS all work")
        finally:
            await storage.delete(key)

    async def public_api(self) -> Check:
        url = f"{self._s.oauth_callback_base}/health"
        try:
            response = await self._http.get(url)
        except httpx.HTTPError as exc:
            return Check(
                "Public API address",
                Status.WARN,
                f"{url} not reachable ({type(exc).__name__})",
                "Fine before deploying. After deploying, networks must reach this address over https.",
            )
        if response.status_code != 200:
            return Check("Public API address", Status.FAIL, f"{url} answered {response.status_code}")
        return Check("Public API address", Status.OK, f"{url} is reachable")

    async def admin(self) -> Check:
        from blakrasocial.infrastructure.persistence import SqlUserRepository, create_engine, session_factory
        from blakrasocial.infrastructure.security.aes_cipher import AesGcmCipher

        assert self._s.database_url is not None
        engine = create_engine(self._s.database_url.get_secret_value())
        try:
            users = SqlUserRepository(session_factory(engine), AesGcmCipher(self._s.encryption_keys()))
            admins = await users.count_admins()
        finally:
            await engine.dispose()
        if not admins:
            return Check(
                "Admin account",
                Status.WARN,
                "no admin yet",
                "Run: python -m blakrasocial.cli create-admin --email you@example.com",
            )
        return Check("Admin account", Status.OK, f"{admins} admin(s)")

    # ---------------------------------------------------------------- networks
    def _missing(self, name: str, var: str) -> Check:
        return Check(name, Status.WARN, "not configured (hidden in the app)", f"Set {var}_ID/SECRET to enable it.")

    async def facebook(self) -> Check:
        s = self._s
        if not (s.facebook_app_id and s.facebook_app_secret):
            return self._missing("Facebook", "FACEBOOK_APP")
        base = f"https://graph.facebook.com/{s.meta_graph_version}"
        token = await self._http.get(
            f"{base}/oauth/access_token",
            params={
                "client_id": s.facebook_app_id,
                "client_secret": s.facebook_app_secret.get_secret_value(),
                "grant_type": "client_credentials",
            },
        )
        if token.status_code != 200:
            return Check(
                "Facebook", Status.FAIL, "Meta rejected the app id/secret", "Copy them again from App settings."
            )
        app = await self._http.get(
            f"{base}/{s.facebook_app_id}",
            params={"fields": "name", "access_token": token.json()["access_token"]},
        )
        name = app.json().get("name", "?") if app.status_code == 200 else "?"
        return Check("Facebook", Status.OK, f"app '{name}' credentials are valid")

    async def instagram(self) -> Check:
        s = self._s
        if not (s.instagram_app_id and s.instagram_app_secret):
            return self._missing("Instagram", "INSTAGRAM_APP")
        if s.instagram_app_id == s.facebook_app_id:
            return Check(
                "Instagram",
                Status.FAIL,
                "INSTAGRAM_APP_ID equals FACEBOOK_APP_ID",
                "Use the separate 'Instagram app ID' from Instagram > API setup with Instagram login.",
            )
        # Instagram has no app-only token to test with; the first real connect confirms the pair.
        return Check("Instagram", Status.OK, "configured (verified on the first connect)")

    async def tiktok(self) -> Check:
        s = self._s
        if not (s.tiktok_client_key and s.tiktok_client_secret):
            return self._missing("TikTok", "TIKTOK_CLIENT")
        response = await self._http.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data={
                "client_key": s.tiktok_client_key,
                "client_secret": s.tiktok_client_secret.get_secret_value(),
                "grant_type": "client_credentials",
            },
        )
        if response.status_code == 200 and "access_token" in response.json():
            return Check("TikTok", Status.OK, "client key/secret are valid")
        return Check(
            "TikTok", Status.FAIL, "TikTok rejected the client key/secret", "Copy them again from the app page."
        )

    async def linkedin(self) -> Check:
        s = self._s
        if not (s.linkedin_client_id and s.linkedin_client_secret):
            return self._missing("LinkedIn", "LINKEDIN_CLIENT")
        response = await self._http.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "client_credentials",
                "client_id": s.linkedin_client_id,
                "client_secret": s.linkedin_client_secret.get_secret_value(),
            },
        )
        error = (
            response.json().get("error")
            if response.headers.get("content-type", "").startswith("application/json")
            else None
        )
        if error == "invalid_client":
            return Check(
                "LinkedIn", Status.FAIL, "LinkedIn rejected the client id/secret", "Copy them from the Auth tab."
            )
        # Apps without client-credentials access get a different error: that still proves the pair is right.
        return Check("LinkedIn", Status.OK, f"client id/secret accepted (api version {s.linkedin_version()})")
