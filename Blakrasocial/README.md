# Blakrasocial: Social Publisher

Customers connect their Instagram, Facebook, TikTok and LinkedIn accounts through each network's own
OAuth consent page, then create and publish posts, Reels, Stories, videos and images from one panel.
WhatsApp is supported for **messages to contacts** (not Status).

```
Blakrasocial/
├── backend/    Python 3.12 · FastAPI · Clean Architecture · Ayrshare adapter
├── frontend/   React 18 · TypeScript · Vite · TanStack Query · RHF + Zod · Tailwind · i18n (fa/en, RTL)
└── docker-compose.yml
```

## How it works

```
Browser ──JWT──▶ Blakrasocial API ──API key + Profile-Key──▶ Ayrshare ──▶ Instagram / Facebook / TikTok / LinkedIn / WhatsApp
   │                    │
   └── PUT file ───────▶ provider storage (presigned URL, never through our API)
```

1. The host platform creates one Ayrshare **User Profile** per customer (`POST /profiles`, server-to-server) and stores the returned `profileKey`.
2. When a customer opens the panel, the host gives the frontend a short-lived **JWT** that carries the `profileKey` claim.
3. **Connect**: the API returns a hosted linking URL; the frontend opens it in a popup; the customer logs in on the network's own page. On close, accounts are refetched.
4. **Upload**: the API returns a single-use presigned URL plus a signed `mediaToken`; the browser uploads straight to storage with a progress bar.
5. **Publish**: the frontend sends captions, targets and `{url, token}` pairs with an `Idempotency-Key`. The API verifies the tokens, measures each file with `ffprobe`, validates every network's rules, and only then calls the provider.

## Architecture (backend)

| Layer | Contents | Depends on |
|---|---|---|
| `domain/` | Entities and value objects (`Post`, `PostTarget`, `MediaAsset`, `Platform`, `ContentType`…), one validation **Strategy** per network (`InstagramRule`, `TikTokRule`, …) driven by declarative `ContentSpec` data | nothing |
| `application/` | Use cases (`PublishPost`, `SchedulePost`, `UploadMedia`, `ConnectAccount`, `ListAccounts`, `UnlinkAccount`, `GetPostStatus`, `ListPosts`, `DeletePost`, `HandlePublishWebhook`) and **ports**: `SocialPublisher`, `DirectMessenger`, `MediaInspector`, `MediaReferenceSigner`, `IdempotencyStore`, `WebhookSignatureVerifier`, `CallerAuthenticator`, `Clock` | domain |
| `infrastructure/` | `AyrsharePublisher` (the only Ayrshare code), WhatsApp messenger, resilient httpx client (tenacity backoff + jitter, safe retries only), ffprobe inspector, HMAC media signer, JWT authenticator, Redis/in-memory idempotency, structlog | application, domain |
| `api/` | Routers, Pydantic v2 schemas (camelCase), DI, problem+json error mapping, security headers | application |
| `container.py` | Composition root: the only place that picks adapters | all |

Replacing Ayrshare means writing one new class that implements `SocialPublisher` and changing one line in `container.py`.

## Security decisions

| Risk | What we do |
|---|---|
| A user sending another customer's `X-Profile-Key` | The key must match the `profile_key` claim inside the verified JWT (issuer, audience, expiry and signature checked; `alg=none` rejected). |
| Secrets in the browser | Ayrshare API key, webhook secret and signing secrets live only in backend env vars. The frontend never sees them. |
| Fake media metadata, SSRF through arbitrary URLs, using another customer's files | Publishing accepts only URLs carrying our HMAC `mediaToken` bound to the customer and expiry. Size, ratio and duration are measured server-side with ffprobe. |
| Double posting (double click, retry after timeout) | `Idempotency-Key` per request, scoped per customer, stored atomically (Redis `SET NX` or in-memory), also forwarded to Ayrshare's `idempotencyKey`. Same key + different body → 409. |
| Forged webhooks | HMAC-SHA256 over the raw body, constant-time compare, timestamp window, fails closed without a secret. |
| Profile creation abuse | `POST /profiles` requires a server-to-server `X-Service-Key`. |
| Misconfiguration | Startup refuses short secrets, mixed JWT algorithm types, and CORS `*` in production. Docs are hidden in production. |
| Leaks in logs | Profile keys are masked; auth headers and secrets are redacted by the log processor. |

## Setup

### 1. Ayrshare keys

1. Sign up at [ayrshare.com](https://www.ayrshare.com) and choose the **Business** plan (User Profiles are required for multi-customer use).
2. Dashboard → **API Key**: copy the Primary Profile API key → `AYRSHARE_API_KEY`.
3. Dashboard → **Social Networks**: enable Instagram, Facebook, TikTok and LinkedIn. Optionally register your own linking domain → `AYRSHARE_LINK_DOMAIN`.
4. Webhooks (recommended): pick a random secret → `AYRSHARE_WEBHOOK_SECRET`, and set `PUBLIC_WEBHOOK_URL=https://<your-api>/webhooks/ayrshare`. New profiles register the webhook automatically.
5. WhatsApp: email Ayrshare to join the WhatsApp/Messages private beta, then set `AYRSHARE_MESSAGING_ENABLED=true`.

### 2. Backend

```bash
cd Blakrasocial/backend
cp .env.example .env              # fill in the values (see comments in the file)
uv sync                           # Python 3.12 + deps (or: pip install -e . && pip install pytest respx ...)
uv run uvicorn blakrasocial.main:app_factory --factory --reload
# http://localhost:8000/docs  (hidden when ENVIRONMENT=production)
```

`ffprobe` must be installed (`brew install ffmpeg` / `apt install ffmpeg`); the Docker image includes it.

Create a profile and a development token:

```bash
curl -X POST localhost:8000/profiles -H "X-Service-Key: $SERVICE_KEY" -H "Content-Type: application/json" -d '{"title":"Demo customer"}'
uv run python scripts/issue_dev_token.py <profileKey>   # development only
```

### 3. Frontend

```bash
cd Blakrasocial/frontend
cp .env.example .env.local        # VITE_API_BASE_URL, and VITE_DEV_ACCESS_TOKEN from the step above
npm install
npm run dev                       # http://localhost:5173
```

In production the host page supplies tokens instead of the env var:

```html
<script>
  window.BlakrasocialConfig = { getAccessToken: () => fetch("/api/social-token").then((r) => r.text()) };
</script>
```

### 4. Everything with Docker

```bash
cp backend/.env.example backend/.env   # fill in
docker compose up --build              # API :8000 (+ Redis), web :5173
```

## Tests and checks

```bash
cd backend  && uv run pytest && uv run ruff check . && uv run mypy src     # 90 tests
cd frontend && npm test && npm run lint && npm run build
```

Backend tests cover every validation strategy, the use cases (idempotency, forged media, scheduling, WhatsApp fan-out), the Ayrshare adapter against `respx` mocks (body mapping, retries, error translation), security (JWT, media tokens, webhooks), and the HTTP API (auth, problem+json, CORS).

Keeping DTOs in sync: `uv run python scripts/export_openapi.py ../frontend/openapi.json`, then `npm run gen:api` in the frontend.

## Environment variables

See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example); every variable is documented there.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/profiles` | `X-Service-Key` | Create customer profile → `profileKey` |
| GET | `/accounts/connect-url` | JWT + `X-Profile-Key` | Hosted linking URL for the popup |
| GET | `/accounts` | JWT | Connected networks, names, avatars, account type |
| DELETE | `/accounts/{platform}` | JWT | Disconnect |
| POST | `/media/upload-url` | JWT | Presigned upload URL + access URL + `mediaToken` |
| POST | `/posts` | JWT + `Idempotency-Key` | Publish now, or schedule with `scheduleAt` |
| GET | `/posts` | JWT | Recent posts with per-network status |
| GET | `/posts/{id}` | JWT | Status per network |
| DELETE | `/posts/{id}` | JWT | Delete / cancel |
| POST | `/webhooks/ayrshare` | HMAC signature | Publish results |
| GET | `/platforms/rules` | public | The limits the backend enforces (the UI reads these) |
| GET | `/health` | public | Liveness |

Errors are `application/problem+json` with an `errors[]` list of `{code, platform, field, severity, message, params}`.

## Known platform limitations

- **Instagram**: Business or Creator accounts only (linked to a Facebook Page). Stories need a **Business** account. Max 5 hashtags, 3 mentions, 2,200 characters, 50 posts per 24 h. Published posts **cannot be deleted** through the API.
- **Facebook**: Pages only (not personal profiles or groups). Image Stories can't be deleted through the API. A photo or video already used in a post can't be reused as a Story.
- **TikTok**: Max 15 posts per day, photo posts accept JPG/WEBP only (not PNG), one video per post. Published posts **cannot be deleted** through the API. The account must be re-authorized yearly. "Followers" visibility only works on private accounts.
- **LinkedIn**: Groups aren't supported. Video on company pages needs admin rights. Document (PDF/PPT) posts are supported by the backend rules but need a storage adapter that accepts documents, because the provider's presigned upload accepts only JPG, PNG, MP4 and MOV.
- **WhatsApp**: Status **cannot** be published by any API. Messages only reach contacts who wrote to the business in the last 24 hours (template messages aren't available yet through Ayrshare). Ayrshare's WhatsApp support is in private beta. Messages can't be scheduled, and their results are returned only in the publish response (there's no database in v1).
- **Media lifetime**: uploaded files are kept by the provider for 30 days, so posts can be scheduled up to 29 days after upload.
- **No database (v1)**: Ayrshare is the source of truth. Post history comes from Ayrshare (last 365 days max), and webhook results are written to structured logs.
- **Idempotency** uses memory by default; set `REDIS_URL` when running more than one API instance.
