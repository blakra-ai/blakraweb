# Blakrasocial: Social Publisher

Customers connect their Instagram, Facebook, TikTok and LinkedIn accounts on each network's own login and
consent page, then create and publish posts, Reels, Stories, videos and images from one panel.
WhatsApp is supported for **messages to contacts** (not Status).

```
Blakrasocial/
├── backend/    Python 3.12 · FastAPI · Clean Architecture · PostgreSQL · official network APIs (or Ayrshare)
├── frontend/   React 18 · TypeScript · Vite · TanStack Query · RHF + Zod · Tailwind · i18n (fa/en, RTL)
├── e2e/        Browser test of the full flow against simulated services
└── docker-compose.yml
```

## Two ways to reach the networks

| | `PUBLISHER=direct` (default) | `PUBLISHER=ayrshare` |
|---|---|---|
| Cost | **Free** network APIs (you host the API, database and storage) | Ayrshare Business plan |
| Customer accounts | Our own OAuth with each network | Ayrshare's linking page |
| Needs | PostgreSQL, an S3-compatible bucket, one developer app per network, **app review** by Meta and TikTok before customers outside your team can connect | Only an API key |

The use cases, validation rules, security and frontend are identical in both modes; only the adapter behind
the `SocialPublisher` port changes.

## How direct mode works

```
Browser ──JWT──▶ API ──▶ PostgreSQL (posts, encrypted tokens) ◀── Worker ──▶ Instagram / Facebook / TikTok / LinkedIn / WhatsApp
   │               │                                                │
   │               └── consent popup: network login ──▶ /oauth/<network>/callback
   └── PUT file ──▶ S3-compatible bucket (presigned URL) ◀──────────┘ networks download / worker streams from it
```

1. **Profiles**: the host platform creates one profile per customer (`POST /profiles`, server-to-server) and keeps the returned `profileKey`. The database stores only its SHA-256.
2. **Session**: the host gives the frontend a short-lived **JWT** carrying the `profile_key` claim.
3. **Connect**: `GET /accounts/connect-url?platform=…` returns the network's consent URL with a one-time `state` (hashed, 10 minutes, bound to the network) and PKCE where the network supports it. The network redirects to `/oauth/<network>/callback`; tokens are encrypted with AES-256-GCM and never reach the browser. Facebook users pick which Page to connect.
4. **Upload**: the API returns a presigned PUT (content type and size are signed) plus a signed `mediaToken`; the browser uploads straight to the bucket.
5. **Publish**: the API verifies media tokens, measures files with `ffprobe`, validates every network's rules and stores the post with one **target per network**. "Publish now" and "schedule" use the same queue.
6. **Worker**: claims due targets with `FOR UPDATE SKIP LOCKED` leases, publishes with the customer's token, polls networks that process asynchronously (Reels, TikTok, LinkedIn video), retries transient failures with backoff, flags accounts that must reconnect, and refreshes Instagram/TikTok tokens before they expire.

## Architecture (backend)

| Layer | Contents | Depends on |
|---|---|---|
| `domain/` | Entities and value objects (`Post`, `PostTarget`, `MediaAsset`, `OAuthCredential`…), one validation **Strategy** per network driven by declarative `ContentSpec` data | nothing |
| `application/` | Use cases (`PublishPost`, `SchedulePost`, `UploadMedia`, `ConnectAccount`, `ListPosts`, `DeletePost`, `SetupWhatsApp`…); **ports** (`SocialPublisher`, `OAuthProvider`, `PlatformConnector`, repositories, `ObjectStorage`, `SecretCipher`, `DirectMessenger`, `MediaInspector`, `IdempotencyStore`…); `direct/` services: `AccountLinker`, `PostQueue`, `PublishWorker`, `TokenRefresher`, `DirectSocialPublisher` | domain |
| `infrastructure/` | `networks/` (Instagram, Facebook, WhatsApp, TikTok, LinkedIn adapters), `persistence/` (SQLAlchemy 2 + Alembic), `storage/` (S3), AES-GCM cipher, `ayrshare/`, resilient httpx client, ffprobe, JWT, idempotency, logging | application, domain |
| `api/` | Routers, Pydantic v2 schemas (camelCase), DI, problem+json errors, OAuth callback pages | application |
| `container.py` | Composition root: picks adapters from `PUBLISHER` and which networks have apps | all |

Adding a network = one `OAuthProvider` + one `PlatformConnector` + one line in the registry.

## Security decisions

| Risk | What we do |
|---|---|
| A user sending another customer's `X-Profile-Key` | The key must match the `profile_key` claim inside the verified JWT (issuer, audience, expiry, signature; `alg=none` rejected). |
| Stolen database | Tokens are AES-256-GCM encrypted with the row identity as associated data (a ciphertext can't be moved to another customer); profile keys are stored only as hashes. Keys come from env and can be rotated. |
| OAuth CSRF / replayed callbacks | Random single-use `state`, stored hashed, expires in 10 minutes, bound to customer and network; PKCE where supported; redirects only to allowed origins. |
| Callback page injection | Every value is HTML-escaped; strict CSP with a per-response nonce, `frame-ancestors 'none'`. |
| Secrets in the browser | App secrets, tokens and signing keys live only in the backend. |
| Fake media metadata, SSRF, using another customer's files | Only URLs carrying our HMAC `mediaToken` (bound to customer and expiry) are accepted; ffprobe measures files server-side; presigned uploads sign size and type. |
| Double posting | `Idempotency-Key` per customer (Redis or memory) plus a unique `(profile, key)` constraint in the database; worker leases stop two workers from taking the same target. |
| Admin-only actions | `POST /profiles` and `PUT /profiles/whatsapp` need a server-to-server `X-Service-Key`. |
| Misconfiguration | Startup refuses short secrets, malformed encryption keys, half-configured network apps, mixed JWT algorithms, CORS `*` and plain-HTTP callback URLs in production. |
| Leaks in logs | Profile keys are masked; tokens and auth headers are redacted. |

## Setup

The step-by-step Persian guide for creating each network's app and getting it approved is in
`/mnt/project-files/blakrasocial/04-direct-setup-guide-fa.md` (project files). In short:

### 1. Network apps (free)

| Network | Where | Products / permissions | Callback URL to register |
|---|---|---|---|
| Instagram | developers.facebook.com → app → Instagram → API setup with Instagram login | `instagram_business_basic`, `instagram_business_content_publish` | `<PUBLIC_API_BASE_URL>/oauth/instagram/callback` |
| Facebook | same Meta app → Facebook Login for Business | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` | `<PUBLIC_API_BASE_URL>/oauth/facebook/callback` |
| TikTok | developers.tiktok.com | Login Kit + Content Posting API (Direct Post), scopes `user.info.basic`, `video.publish` | `<PUBLIC_API_BASE_URL>/oauth/tiktok/callback` |
| LinkedIn | linkedin.com/developers | Sign In with LinkedIn using OpenID Connect + Share on LinkedIn | `<PUBLIC_API_BASE_URL>/oauth/linkedin/callback` |
| WhatsApp | Meta app → WhatsApp → API setup | System-user token with `whatsapp_business_messaging` | — (set per profile with `PUT /profiles/whatsapp`) |

Until Meta's App Review and TikTok's audit are approved, only accounts with a role in your app can connect, and
TikTok posts are forced to "Only me". LinkedIn personal profiles work without review.

### 2. Storage

Create an S3-compatible bucket with a **public HTTPS read URL** (Cloudflare R2: 10 GB free, no download fees).
Allow `PUT` from your frontend origin in the bucket's CORS rules, and add a lifecycle rule that deletes objects
after 30 days. Fill `STORAGE_*` in `backend/.env`.

### 3. Backend

```bash
cd Blakrasocial/backend
cp .env.example .env               # fill in (every variable is documented there)
uv sync
uv run alembic upgrade head        # creates the tables
uv run uvicorn blakrasocial.main:app_factory --factory --reload
```

`RUN_WORKER_IN_API=true` publishes from the API process. With more than one instance, set it to `false` and run
`uv run python -m blakrasocial.worker` (any number of workers is safe).

Create a profile and a development token:

```bash
curl -X POST localhost:8000/profiles -H "X-Service-Key: $SERVICE_KEY" -H "Content-Type: application/json" -d '{"title":"Demo customer"}'
uv run python scripts/issue_dev_token.py <profileKey>   # development only
```

Attach a WhatsApp Business number to a profile (admin):

```bash
curl -X PUT localhost:8000/profiles/whatsapp -H "X-Service-Key: $SERVICE_KEY" -H "Content-Type: application/json" \
  -d '{"profileKey":"<profileKey>","phoneNumberId":"<id>","accessToken":"<system user token>","displayName":"Support"}'
```

### 4. Frontend

```bash
cd Blakrasocial/frontend
cp .env.example .env.local         # VITE_API_BASE_URL, and VITE_DEV_ACCESS_TOKEN from the step above
npm install
npm run dev                        # http://localhost:5173
```

In production the host page supplies tokens instead of the env var:

```html
<script>
  window.BlakrasocialConfig = { getAccessToken: () => fetch("/api/social-token").then((r) => r.text()) };
</script>
```

### 5. Everything with Docker

```bash
cp backend/.env.example backend/.env   # fill in storage and network apps
docker compose up --build              # migrations, API :8000, worker, PostgreSQL, Redis, web :5173
```

## Tests and checks

```bash
cd backend  && uv run pytest && uv run ruff check . && uv run mypy src     # 136 tests (PostgreSQL ones need TEST_DATABASE_URL)
cd frontend && npm test && npm run lint && npm run build
```

- PostgreSQL integration: OAuth state single use/expiry/binding, encryption at rest, queue, worker retries, polling, reconnect flags, cancellation, isolation between customers, concurrent workers never taking the same post.
- Every network adapter against `respx` mocks: OAuth exchange and refresh, request bodies, chunked uploads, polling, error translation.
- Validation strategies, use cases, security (JWT, media tokens, webhooks) and the HTTP API, including the callback pages.
- `e2e/`: the whole flow in a real browser against simulated services.

Keeping DTOs in sync: `uv run python scripts/export_openapi.py ../frontend/openapi.json`, then `npm run gen:api`.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/profiles` | `X-Service-Key` | Create customer profile → `profileKey` |
| PUT | `/profiles/whatsapp` | `X-Service-Key` | Attach a WhatsApp Business number (direct mode) |
| GET | `/accounts/connect-url?platform=` | JWT + `X-Profile-Key` | Consent URL for the popup |
| GET | `/oauth/{platform}/callback` | one-time `state` | Where the network returns after consent |
| GET | `/accounts` | JWT | Connected networks, names, avatars, reconnect flags |
| DELETE | `/accounts/{platform}` | JWT | Disconnect |
| POST | `/media/upload-url` | JWT | Presigned upload URL + access URL + `mediaToken` |
| POST | `/posts` | JWT + `Idempotency-Key` | Publish now, or schedule with `scheduleAt` |
| GET | `/posts`, `/posts/{id}` | JWT | Posts with per-network status |
| DELETE | `/posts/{id}` | JWT | Cancel a scheduled post or delete where the network allows it |
| GET | `/platforms/rules` | public | Limits the backend enforces, and which networks can be connected |
| POST | `/webhooks/ayrshare` | HMAC signature | Publish results (Ayrshare mode) |
| GET | `/health` | public | Liveness |

Errors are `application/problem+json` with an `errors[]` list of `{code, platform, field, severity, message, params}`.

## Known platform limitations

- **Instagram**: professional (Business or Creator) accounts only; Stories need Business. Images must be JPEG. About 100 API posts per 24 h. Published posts **cannot be deleted** through the API. Tokens last 60 days and are refreshed automatically.
- **Facebook**: Pages only (not personal profiles or groups). Reels: 9:16, 3–90 s, 30 per 24 h.
- **TikTok**: until TikTok audits the app, posts are visible to **Only me**. Photo posts need the storage domain verified in the TikTok developer portal. Published posts **cannot be deleted** through the API. Access tokens last 24 h and are refreshed automatically; customers reconnect once a year.
- **LinkedIn**: personal profiles. Company pages need LinkedIn's Community Management API approval. Self-serve apps get no refresh token, so customers **reconnect every 60 days** (the card shows "Reconnect needed").
- **WhatsApp**: Status **cannot** be published by any API. Free-form messages only reach contacts who wrote to the business in the last 24 hours. Meta gives each number 1,000 free service messages a month; beyond that and for templates it charges per message. Messages can't be scheduled.
- **Media lifetime**: uploads are signed for 29 days; delete them with a bucket lifecycle rule.
- **At-least-once publishing**: if a worker crashes right after a network accepted a post but before saving the result, the post may be published twice when the lease expires. This is rare and the trade-off for never losing a post.
- **Idempotency** uses memory by default; set `REDIS_URL` when running more than one API instance (the database constraint still prevents duplicate posts).
