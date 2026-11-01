#!/usr/bin/env bash
# One-time setup on the server: writes deploy/.env and deploy/backend.env with freshly generated
# secrets, so the only things left to fill in are the storage bucket and the network app keys.
#
#   ./setup.sh social.example.com you@example.com ["Company name"]
set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="${1:-}"; EMAIL="${2:-}"; COMPANY="${3:-Blakra}"
if [[ -z "$DOMAIN" || -z "$EMAIL" || "$DOMAIN" == http* || "$DOMAIN" == */* ]]; then
  echo "Usage: ./setup.sh your-domain.com you@example.com [\"Company name\"]   (domain without https://)" >&2
  exit 2
fi
for file in .env backend.env; do
  if [[ -e "$file" ]]; then
    echo "deploy/$file already exists; not touching it (delete it first to start over)." >&2
    exit 1
  fi
done
command -v openssl >/dev/null || { echo "openssl is needed" >&2; exit 1; }

secret() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }
umask 077

cat > .env <<ENV
# Read by docker compose. Keep this file private.
DOMAIN=$DOMAIN
ACME_EMAIL=$EMAIL
CONTACT_EMAIL=$EMAIL
COMPANY_NAME=$COMPANY
POSTGRES_PASSWORD=$(openssl rand -hex 24)
BACKUP_KEEP_DAYS=14
ENV

# Start from the documented example and replace everything that must differ in production.
sed \
  -e "s|^ENVIRONMENT=.*|ENVIRONMENT=production|" \
  -e "s|^LOG_LEVEL=.*|LOG_LEVEL=INFO|" \
  -e "s|^PUBLISHER=.*|PUBLISHER=direct|" \
  -e "s|^PUBLIC_API_BASE_URL=.*|PUBLIC_API_BASE_URL=https://$DOMAIN/api|" \
  -e "s|^PUBLIC_APP_URL=.*|PUBLIC_APP_URL=https://$DOMAIN|" \
  -e "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://$DOMAIN|" \
  -e "s|^RUN_WORKER_IN_API=.*|RUN_WORKER_IN_API=false|" \
  -e "s|^CREDENTIALS_ENCRYPTION_KEYS=.*|CREDENTIALS_ENCRYPTION_KEYS=k$(date +%Y%m%d):$(openssl rand -base64 32)|" \
  -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$(secret)|" \
  -e "s|^MEDIA_SIGNING_SECRET=.*|MEDIA_SIGNING_SECRET=$(secret)|" \
  -e "s|^SERVICE_API_KEYS=.*|SERVICE_API_KEYS=$(secret)|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=set-by-docker-compose|" \
  -e "s|^REDIS_URL=.*|REDIS_URL=set-by-docker-compose|" \
  -e "s/^\([A-Z0-9_]*=[^ ]*\)  *#.*$/\1/" \
  ../backend/.env.example > backend.env

mkdir -p backups
echo "Wrote deploy/.env and deploy/backend.env (secrets generated, readable only by you)."
echo
echo "Next:"
echo "  1. Point the DNS A record of $DOMAIN to this server's IP address."
echo "  2. Fill in STORAGE_* and the network keys in deploy/backend.env (see the guide)."
echo "  3. docker compose up -d --build"
echo "  4. docker compose run --rm api python -m blakrasocial.cli doctor"
echo "  5. docker compose run --rm api python -m blakrasocial.cli create-admin --email $EMAIL"
echo
echo "Keep a copy of deploy/backend.env somewhere safe: without CREDENTIALS_ENCRYPTION_KEYS a database"
echo "backup can be restored, but every customer would have to connect their networks again."
