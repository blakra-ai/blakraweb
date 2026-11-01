# End-to-end runs

## Ayrshare mode

Runs the 13-step manual scenario from the testing guide in a real Chromium, against the real
backend and frontend. Ayrshare is replaced by `fake_ayrshare.py`, which mimics the endpoints we use
(profiles, link sessions + linking page, user, presigned upload + storage, post, history, delete,
WhatsApp). Use it to check the whole flow without a paid Ayrshare account; it does not replace a
final check against the real Ayrshare.

```bash
# 1. TLS cert for the fake (the backend only talks HTTPS)
mkdir -p .tls && openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=localhost \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" -keyout .tls/key.pem -out .tls/cert.pem
# 2. Test videos
mkdir -p media
ffmpeg -f lavfi -i testsrc2=size=720x1280:rate=30 -t 10 -pix_fmt yuv420p media/vertical.mp4
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 10 -pix_fmt yuv420p media/wide.mp4
# 3. Fake Ayrshare on https://localhost:9443
../backend/.venv/bin/python fake_ayrshare.py
# 4. Backend (.env.example values) pointed at the fake
AYRSHARE_API_KEY=fake-ayrshare-api-key AYRSHARE_BASE_URL=https://localhost:9443/api \
SSL_CERT_FILE=$PWD/.tls/cert.pem uv run --directory ../backend uvicorn blakrasocial.main:app_factory --factory
# 5. Create a profile, issue a dev token (see the testing guide), then run the frontend with
#    VITE_API_BASE_URL=http://localhost:8000 VITE_DEV_ACCESS_TOKEN=<token> npm run dev
# 6. Run the scenario (screenshots go to shots/)
node run_scenario.cjs
```

## Direct mode (free official APIs)

`run_direct_scenario.cjs` drives 11 steps in a real Chromium against the real backend, worker and
PostgreSQL: connect Instagram (and a cancelled login), connect Facebook with the "choose a Page"
step, refuse a replayed login link, upload a video straight to the bucket, publish a Reel to
Instagram + a video to Facebook and wait for the worker to finish both, schedule and cancel a post,
and disconnect. `fake_networks.py` stands in for the networks' login pages and APIs (same paths,
documented response shapes) and for an S3 bucket. `direct_backend.py` starts the unchanged backend
and only reroutes its outgoing requests for the network hosts to the fake.

```bash
# TLS cert + test videos: steps 1-2 above. A PostgreSQL database for the run:
createdb blakrasocial_e2e && DATABASE_URL=postgresql+asyncpg://.../blakrasocial_e2e uv run --directory ../backend alembic upgrade head
../backend/.venv/bin/python fake_networks.py                 # https://localhost:9444
E2E_DATABASE_URL=postgresql+asyncpg://.../blakrasocial_e2e ./start_direct_backend.sh   # :8000, worker inside
# Create a profile + dev token and start the frontend as in step 5 above, then:
node run_direct_scenario.cjs                                  # screenshots go to shots/direct/
```

It proves our side of every flow. It cannot prove the networks accept our app: that needs your own
developer apps and their review (see the setup guide).
