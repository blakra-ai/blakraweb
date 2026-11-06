# End-to-end runs

## Ayrshare mode (legacy, paid)

Kept for reference only: the project now uses direct mode. Ayrshare mode has no built-in sign-in,
so the frontend needs a host page that supplies tokens through `window.BlakrasocialConfig`.

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
ffmpeg -f lavfi -i testsrc=size=1080x1080:rate=1 -frames:v 1 -q:v 3 media/square.jpg
# 3. Fake Ayrshare on https://localhost:9443
../backend/.venv/bin/python fake_ayrshare.py
# 4. Backend (.env.example values) pointed at the fake
AYRSHARE_API_KEY=fake-ayrshare-api-key AYRSHARE_BASE_URL=https://localhost:9443/api \
SSL_CERT_FILE=$PWD/.tls/cert.pem uv run --directory ../backend uvicorn blakrasocial.main:app_factory --factory
# 5. Serve the frontend from a host page that sets window.BlakrasocialConfig.getAccessToken
# 6. Run the scenario (screenshots go to shots/)
node run_scenario.cjs
```

## Direct mode (free official APIs)

`run_direct_scenario.cjs` drives 18 steps in a real Chromium against the real backend, worker and
PostgreSQL, starting from an empty database:

1. `create-admin` prints the owner's link; signed-out visitors land on the sign-in page.
2. The owner sets a password (a weak one is refused); the link then stops working.
3. The owner creates a customer, copies the one-time link; a duplicate email is refused.
4. The customer sets a password, sees no admin menu, stays signed in after a reload.
5. A wrong password gets one generic message.
6. A cancelled Instagram login connects nothing.
7. Instagram, Facebook (with the Page picker), TikTok and LinkedIn connect on their login pages.
8. A made-up / replayed login callback is refused.
9. A video goes from the browser straight to the bucket; a Reel to Instagram + a Facebook video are
   published by the worker (a double-click still makes one post).
10. The TikTok form follows TikTok's audit rules (creator name, no default privacy, Duet locked,
    commercial-content labels, consent text) and the post reaches TikTok with those settings.
10b. TikTok "send to inbox" (works before TikTok's audit): no audience is asked, the video is
    uploaded to the creator's TikTok inbox and the post says to finish in the TikTok app.
11. A JPEG goes to LinkedIn (image upload, then post) and Instagram.
12. A scheduled post waits, then is published when due (the test moves its due time to now).
13. A scheduled post that is deleted never reaches the network.
14. After the user removes the app on Instagram, the post fails with a clear reason and the card
    asks to reconnect.
15. Meta's signed data-deletion request removes the Facebook connection and returns a status page;
    a request with a wrong signature is refused.
16. The sign-in page explains what the app does and links the legal pages; the privacy, terms and
    data-deletion pages are public and show the contact email.
17. The admin deletes the customer: sign-in, connections, posts and uploaded files are gone.

`fake_networks.py` stands in for the networks' login pages and APIs (same paths, documented
response shapes) and for an S3 bucket. `direct_backend.py` starts the unchanged backend and only
reroutes its outgoing requests for the network hosts to the fake.

```bash
# TLS cert + test media: steps 1-2 above. A PostgreSQL database for the run:
createdb blakrasocial_e2e && DATABASE_URL=postgresql+asyncpg://.../blakrasocial_e2e uv run --directory ../backend alembic upgrade head
../backend/.venv/bin/python fake_networks.py                 # https://localhost:9444
E2E_DATABASE_URL=postgresql+asyncpg://.../blakrasocial_e2e ./start_direct_backend.sh   # :8000, worker inside
./start_direct_backend.sh cli doctor                          # the setup check, against the fakes
(cd ../frontend && VITE_API_BASE_URL=http://localhost:8000 VITE_CONTACT_EMAIL=privacy@blakra.example npm run dev)
E2E_PSQL=postgresql://.../blakrasocial_e2e node run_direct_scenario.cjs   # screenshots in shots/direct/
```

The scenario empties the database and the fake at the start, so it can be run again and again.
It proves our side of every flow. It cannot prove the networks accept our app: that needs your own
developer apps and their review (see the setup guide).
