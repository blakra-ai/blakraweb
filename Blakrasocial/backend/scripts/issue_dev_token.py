"""Issue a short-lived HS256 access token for LOCAL development only.

In production the host platform issues these tokens after logging the user in.

    uv run python scripts/issue_dev_token.py <profileKey>
"""

from __future__ import annotations

import sys
import time

import jwt

from blakrasocial.infrastructure.settings import get_settings


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: issue_dev_token.py <profileKey>")
    settings = get_settings()
    if settings.environment == "production" or settings.auth_jwt_secret is None:
        sys.exit("Refusing: only for development with AUTH_JWT_SECRET.")
    now = int(time.time())
    claims = {
        "sub": "dev-user",
        "iss": settings.auth_jwt_issuer,
        "aud": settings.auth_jwt_audience,
        "iat": now,
        "exp": now + 8 * 3600,
        settings.auth_profile_key_claim: sys.argv[1],
    }
    print(jwt.encode(claims, settings.auth_jwt_secret.get_secret_value(), algorithm=settings.auth_jwt_algorithms[0]))


if __name__ == "__main__":
    main()
