#!/usr/bin/env bash
# Starts direct_backend.py with .env.example values pointed at fake_networks.py (see README.md).
set -euo pipefail
E="$(cd "$(dirname "$0")" && pwd)"
cd "$E/../backend"
export $(grep -v '^#' .env.example | sed 's/ *#.*//' | grep = | xargs)
# The fake runs on localhost; an outbound proxy would otherwise grab the rerouted requests.
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
export DATABASE_URL="${E2E_DATABASE_URL:-postgresql+asyncpg://postgres@localhost:5433/blakrasocial_e2e}"
export STORAGE_ENDPOINT_URL=https://localhost:9444 STORAGE_PUBLIC_BASE_URL=https://localhost:9444/public
export STORAGE_ACCESS_KEY_ID=fake STORAGE_SECRET_ACCESS_KEY=fake-secret
export FACEBOOK_APP_ID=111 FACEBOOK_APP_SECRET=fb-secret-fake INSTAGRAM_APP_ID=222 INSTAGRAM_APP_SECRET=ig-secret-fake
export TIKTOK_CLIENT_KEY=ttfakekey TIKTOK_CLIENT_SECRET=tt-secret-fake LINKEDIN_CLIENT_ID=lifakeid LINKEDIN_CLIENT_SECRET=li-secret-fake
export PUBLIC_APP_URL="${APP_URL:-http://localhost:5173}"
export WORKER_POLL_SECONDS=2 SSL_CERT_FILE="$E/.tls/cert.pem" AWS_CA_BUNDLE="$E/.tls/cert.pem"
if [ "${1:-}" = "cli" ]; then shift; exec .venv/bin/python "$E/direct_backend.py" cli "$@"; fi
exec .venv/bin/python "$E/direct_backend.py"
