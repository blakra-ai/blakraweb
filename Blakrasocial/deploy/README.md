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

## Backups and restore

A dump is written to `deploy/backups/` every night. Copy that folder off the server as well (for example
with `rclone` to another storage account): a backup that lives only on the server is lost with the server.

```bash
docker compose exec -T db pg_restore -U blakra -d blakrasocial --clean --if-exists < backups/blakrasocial-2026-11-01.dump
```

Customer tokens in the database are encrypted with `CREDENTIALS_ENCRYPTION_KEYS` from `backend.env`.
Keep a copy of `backend.env` in a password manager: a restore without it works, but every customer has to
connect their networks again.

## Security notes

- `.env`, `backend.env` and `backups/` are git-ignored and created readable only by you (`umask 077`).
- The API refuses to start in production with the example secrets from `.env.example`, short secrets,
  plain-HTTP public URLs or a CORS wildcard.
- Containers run read-only where possible, without extra privileges; only Caddy is reachable from outside.
- Rotate the encryption key by putting a new `id:key` first in `CREDENTIALS_ENCRYPTION_KEYS` and keeping the
  old one after it.
