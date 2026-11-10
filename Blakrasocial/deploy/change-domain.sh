#!/usr/bin/env bash
# Moves the app to a new domain on the same server. Updates deploy/.env and deploy/backend.env
# (old copies are kept as *.bak-DATE), keeps the old domain redirecting to the new one, and prints
# every place outside the server that still has to be changed.
#
#   ./change-domain.sh new-domain.com              # old domain keeps redirecting (recommended)
#   ./change-domain.sh new-domain.com --no-redirect
set -euo pipefail
cd "$(dirname "$0")"

NEW="${1:-}"; MODE="${2:-}"
if [[ -z "$NEW" || "$NEW" == http* || "$NEW" == */* || ( -n "$MODE" && "$MODE" != "--no-redirect" ) ]]; then
  echo "Usage: ./change-domain.sh new-domain.com [--no-redirect]   (domain without https://)" >&2
  exit 2
fi
for file in .env backend.env; do
  [[ -f "$file" ]] || { echo "deploy/$file is missing: run ./setup.sh first." >&2; exit 1; }
done
OLD="$(sed -n 's/^DOMAIN=//p' .env)"
if [[ "$OLD" == "$NEW" ]]; then
  echo "The domain is already $NEW." >&2
  exit 1
fi

umask 077
stamp="$(date +%Y%m%d-%H%M%S)"
cp .env ".env.bak-$stamp"
cp backend.env "backend.env.bak-$stamp"

sed -i "s|^DOMAIN=.*|DOMAIN=$NEW|" .env
sed -i \
  -e "s|^PUBLIC_API_BASE_URL=.*|PUBLIC_API_BASE_URL=https://$NEW/api|" \
  -e "s|^PUBLIC_APP_URL=.*|PUBLIC_APP_URL=https://$NEW|" \
  -e "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://$NEW|" \
  backend.env

mkdir -p redirects
rm -f "redirects/$NEW.caddy"   # the new domain must be served, not redirected
if [[ "$MODE" != "--no-redirect" && -n "$OLD" ]]; then
  # 308 keeps the method, so links, bookmarks and Meta's POST callbacks still arrive while the
  # network apps are being updated. Works as long as the old domain's DNS points at this server.
  cat > "redirects/$OLD.caddy" <<CADDY
$OLD {
	redir https://$NEW{uri} 308
}
CADDY
fi

cat <<TEXT
Done: $OLD -> $NEW (backups: .env.bak-$stamp, backend.env.bak-$stamp)

Do these now, in this order:
  1. DNS: an A record for $NEW pointing at this server (keep $OLD pointing here for the redirect).
  2. docker compose up -d          (Caddy gets the new certificate; the API restarts with the new address)
  3. docker compose run --rm api python -m blakrasocial.cli doctor
     It prints the exact new URLs. Replace the old ones in every network app:
     - Meta (developers.facebook.com, your app):
         App settings > Basic: App Domains, Privacy Policy URL, Terms of Service URL,
           User data deletion (callback URL), Website > Site URL
         Facebook Login for Business > Settings: Valid OAuth Redirect URIs, Deauthorize callback URL
         Instagram > API setup with Instagram login > Business login settings: OAuth redirect URI,
           Deauthorize callback URL, Data deletion request URL
     - TikTok (developers.tiktok.com): Login Kit Redirect URI, Web/Desktop URL, Terms and Privacy URLs
     - LinkedIn (linkedin.com/developers): Auth > Authorized redirect URLs, Settings > Privacy policy URL
     - Cloudflare R2 bucket > Settings > CORS policy: AllowedOrigins = https://$NEW
  4. Sign in at https://$NEW and post a test to each network.

What happens to users and data:
  - Connected network accounts, posts, schedules and files stay as they are.
  - Everyone signs in once more (the sign-in cookie belongs to the old domain).
  - Unused invite links on $OLD keep working through the redirect; with --no-redirect make new ones.
  - Meta and TikTok see a changed URL as a change in the app: if the app is live, also update the
    privacy policy URL there before the next App Review, otherwise the review fails on a dead link.

Changing the media address (STORAGE_PUBLIC_BASE_URL) is separate; see deploy/README.md.
TEXT
