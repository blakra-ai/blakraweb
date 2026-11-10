"""Owner commands (run inside the API container or the backend folder):

python -m blakrasocial.cli create-admin --email you@example.com [--name "Blakra"]
    Prints a one-time link to set the admin password. Run again if the password is forgotten.
python -m blakrasocial.cli doctor
    Checks database, encryption, storage, public address and every network app; says what to fix.
python -m blakrasocial.cli move-media-url --from https://pub-x.r2.dev --to https://media.example.com
    After changing STORAGE_PUBLIC_BASE_URL: points saved and scheduled posts at the new address.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

import httpx
from pydantic import ValidationError

from blakrasocial.infrastructure.settings import Settings

_ICONS = {"ok": "✅", "warn": "⚠️ ", "fail": "❌"}


def _settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        print("❌ Configuration (.env) has problems:")
        for error in exc.errors():
            where = ".".join(str(p) for p in error["loc"]) or "settings"
            print(f"   - {where}: {error['msg'].removeprefix('Value error, ')}")
        sys.exit(2)


async def _create_admin(email: str, name: str) -> None:
    from blakrasocial.container import build_container

    settings = _settings()
    container = build_container(settings)
    try:
        link = await container.bootstrap_admin().execute(email, name)
    finally:
        await container.aclose()
    hours = link.expires_in_seconds // 3600
    print(f"Admin: {link.user.email}")
    print(f"Open this link within {hours} hours to set the password (it works once):")
    print(f"  {settings.app_base}/invite#{link.token}")


async def _doctor() -> int:
    from blakrasocial.infrastructure.doctor import Doctor, Status

    settings = _settings()
    print("✅ Configuration (.env) loads")
    async with httpx.AsyncClient(timeout=20) as http:
        doctor = Doctor(settings, http)
        checks = await doctor.run()
    for check in checks:
        print(f"{_ICONS[check.status]} {check.name}: {check.detail}")
        if check.fix and check.status is not Status.OK:
            print(f"     → {check.fix}")
    print("\nRegister these exact URLs in the network apps:")
    for label, url in doctor.callback_urls().items():
        print(f"  {label}: {url}")
    return 1 if any(c.status is Status.FAIL for c in checks) else 0


async def _move_media_url(old: str, new: str) -> int:
    from blakrasocial.domain.errors import InvalidValue
    from blakrasocial.infrastructure.persistence import create_engine, session_factory
    from blakrasocial.infrastructure.persistence.maintenance import MediaBaseUrlMigration

    settings = _settings()
    assert settings.database_url
    engine = create_engine(settings.database_url.get_secret_value())
    try:
        changed = await MediaBaseUrlMigration(session_factory(engine)).run(old, new)
    except InvalidValue:
        print("❌ Both addresses must be full https:// URLs.")
        return 2
    finally:
        await engine.dispose()
    print(f"✅ {changed} post(s) now use {new.rstrip('/')}/…")
    if settings.storage_public_base_url and str(settings.storage_public_base_url).rstrip("/") != new.rstrip("/"):
        print("⚠️  STORAGE_PUBLIC_BASE_URL in backend.env is not the new address yet; update it and restart.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m blakrasocial.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="create the owner account (or a new password link)")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", default="Admin")
    sub.add_parser("doctor", help="check the whole setup")
    move = sub.add_parser("move-media-url", help="after changing the bucket's public address")
    move.add_argument("--from", dest="old", required=True, help="the old STORAGE_PUBLIC_BASE_URL")
    move.add_argument("--to", dest="new", required=True, help="the new STORAGE_PUBLIC_BASE_URL")
    args = parser.parse_args(argv)
    if args.command == "create-admin":
        asyncio.run(_create_admin(args.email, args.name))
        return 0
    if args.command == "move-media-url":
        return asyncio.run(_move_media_url(args.old, args.new))
    return asyncio.run(_doctor())


if __name__ == "__main__":
    sys.exit(main())
