"""Write the API's OpenAPI document so the frontend can generate its DTO types.

    uv run python scripts/export_openapi.py ../frontend/openapi.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from blakrasocial.infrastructure.settings import Settings
from blakrasocial.main import create_app

_PLACEHOLDER = "x" * 40


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json")
    settings = Settings(
        environment="development",
        ayrshare_api_key=_PLACEHOLDER,  # type: ignore[arg-type]
        auth_jwt_secret=_PLACEHOLDER,  # type: ignore[arg-type]
        auth_jwt_algorithms=["HS256"],
        auth_jwt_issuer="openapi",
        auth_jwt_audience="openapi",
        media_signing_secret=_PLACEHOLDER,  # type: ignore[arg-type]
    )
    schema = create_app(settings).openapi()
    target.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {target}")


if __name__ == "__main__":
    main()
