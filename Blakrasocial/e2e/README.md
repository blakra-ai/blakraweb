# End-to-end run (simulated Ayrshare)

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
