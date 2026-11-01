"""Owner commands (run inside the API container or the backend folder):

python -m blakrasocial.cli create-admin --email you@example.com [--name "Blakra"]
    Prints a one-time link to set the admin password. Run again if the password is forgotten.
python -m blakrasocial.cli doctor
    Checks database, encryption, storage, public address and every network app; says what to fix.
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m blakrasocial.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="create the owner account (or a new password link)")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", default="Admin")
    sub.add_parser("doctor", help="check the whole setup")
    args = parser.parse_args(argv)
    if args.command == "create-admin":
        asyncio.run(_create_admin(args.email, args.name))
        return 0
    return asyncio.run(_doctor())


if __name__ == "__main__":
    sys.exit(main())
