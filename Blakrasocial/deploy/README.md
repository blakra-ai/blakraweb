# Production on one server

Everything runs with Docker Compose on one Linux server (2 GB RAM is enough to start):

| Service | What it does |
|---|---|
| `caddy` | HTTPS for your domain, certificate from Let's Encrypt, renewed automatically. Serves the app at `https://DOMAIN` and the API at `https://DOMAIN/api` (same site, so the sign-in cookie just works). |
| `web` | The built React app (nginx). |
| `api` | FastAPI. Not published to the internet; only Caddy reaches it. |
| `worker` | Publishes due posts, polls networks, refreshes tokens. |
| `migrate` | Brings the database schema up to date on every start, then exits. |
| `db` | PostgreSQL 17 (data in the `pgdata` volume). |
| `redis` | Sign-in throttling and idempotency keys shared by API instances. |
| `backup` | `pg_dump` every night into `deploy/backups/`, keeps 14 days. |

Media files are not stored on the server: they go to an S3-compatible bucket (Cloudflare R2's free tier).

## First deployment

```bash
# On the server (Docker + the compose plugin installed), in a clone of the repository:
cd Blakrasocial/deploy
./setup.sh social.example.com you@example.com "Your company"   # writes .env + backend.env with new secrets
nano backend.env        # fill STORAGE_* and the network keys (FACEBOOK_*, INSTAGRAM_*, TIKTOK_*, LINKEDIN_*)
docker compose up -d --build
docker compose run --rm api python -m blakrasocial.cli doctor          # everything green? it also lists the URLs to register
docker compose run --rm api python -m blakrasocial.cli create-admin --email you@example.com --name "Your company"
```

Open the printed link, choose your password, and you are the admin. Before `up`, the domain's DNS `A`
record must point at the server and ports 80 and 443 must be open, or Caddy can't get the certificate.

## Everyday

| Task | Command |
|---|---|
| Update to the latest code | `git pull && docker compose up -d --build` (migrations run by themselves) |
| Logs | `docker compose logs -f api worker` |
| Check the setup | `docker compose run --rm api python -m blakrasocial.cli doctor` |
| Forgot the admin password | `docker compose run --rm api python -m blakrasocial.cli create-admin --email you@example.com` |
| Change a key in `backend.env` | edit, then `docker compose up -d` |
| New domain | `./change-domain.sh new-domain.com` (see below) |

## Backups and restore

A dump is written to `deploy/backups/` every night. Copy that folder off the server as well (for example
with `rclone` to another storage account): a backup that lives only on the server is lost with the server.

```bash
docker compose exec -T db pg_restore -U blakra -d blakrasocial --clean --if-exists < backups/blakrasocial-2026-11-01.dump
```

Customer tokens in the database are encrypted with `CREDENTIALS_ENCRYPTION_KEYS` from `backend.env`.
Keep a copy of `backend.env` in a password manager: a restore without it works, but every customer has to
connect their networks again.

## Changing the domain

```bash
./change-domain.sh new-domain.com        # updates .env + backend.env, keeps the old domain redirecting
docker compose up -d
docker compose run --rm api python -m blakrasocial.cli doctor   # prints the new URLs to register
```

The script prints the full list of places outside the server to update (Meta, TikTok and LinkedIn
apps, the R2 CORS origin). Until they are updated, sign-ins to networks fail with "redirect URI
mismatch"; publishing with accounts already connected keeps working, because tokens do not depend on
the domain. Users sign in to the app once more. The old domain keeps redirecting (HTTP 308) as long
as its DNS still points at this server, so old links and Meta's callbacks still arrive; pass
`--no-redirect` if the old domain is gone. The frontend calls `/api` on its own domain, so it needs
no rebuild.

## Changing the media address

If the bucket's public address changes (for example from `pub-….r2.dev` to `media.your-domain.com`,
which TikTok needs for photo posts because it only pulls from domains you verified):

```bash
# 1. Connect the new address to the same bucket in Cloudflare (R2 > bucket > Settings > Custom Domains)
# 2. Set STORAGE_PUBLIC_BASE_URL in backend.env, then:
docker compose up -d
docker compose run --rm api python -m blakrasocial.cli move-media-url --from https://pub-OLD.r2.dev --to https://media.your-domain.com
```

The command points saved and scheduled posts at the new address (same files, same keys). Moving to a
different bucket also means copying the files first (for example `rclone copy old:bucket new:bucket`).

## Moving to a new server

The domain and the network apps stay the same; only the server's IP address changes.

1. A day before, lower the DNS TTL of the domain to 300 seconds, so the switch is quick.
2. New server: install Docker, clone the repository, copy `deploy/.env` and `deploy/backend.env` from
   the old server (with `scp`; never through chat or e-mail). Without `backend.env` the encryption
   key is lost and every customer has to connect their networks again.
3. Old server: stop publishing and take a final dump:
   ```bash
   docker compose stop worker api
   docker compose run --rm --entrypoint sh backup -c 'pg_dump -h db -U blakra -d blakrasocial -Fc -f /backups/final.dump'
   ```
   Copy `deploy/backups/final.dump` to the new server's `deploy/backups/`.
4. New server:
   ```bash
   docker compose up -d db
   docker compose exec -T db pg_restore -U blakra -d blakrasocial --clean --if-exists < backups/final.dump
   docker compose up -d --build
   ```
5. Point the DNS `A` record at the new IP. Caddy gets a certificate as soon as the domain reaches it.
6. Run `doctor` on the new server and post a test. Posts scheduled during the move are published
   by the new worker when it starts. Then `docker compose down` on the old server and delete its copies
   of `backend.env` and the backups.

## Security notes

- `.env`, `backend.env` and `backups/` are git-ignored and created readable only by you (`umask 077`).
- The API refuses to start in production with the example secrets from `.env.example`, short secrets,
  plain-HTTP public URLs or a CORS wildcard.
- Containers run read-only where possible, without extra privileges; only Caddy is reachable from outside.
- Rotate the encryption key by putting a new `id:key` first in `CREDENTIALS_ENCRYPTION_KEYS` and keeping the
  old one after it.
