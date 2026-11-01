"""A local stand-in for Ayrshare (API, linking page, media storage) for end-to-end tests.

It mimics the documented request/response shapes closely enough to drive the real backend and
frontend through the whole customer journey without an Ayrshare account. Not for production.

    python fake_ayrshare.py   # serves https://localhost:9443 (needs cert.pem/key.pem, see run_e2e.sh)
"""

from __future__ import annotations

import json
import secrets
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

BASE = "https://localhost:9443"
STORAGE = Path(tempfile.mkdtemp(prefix="fake-ayrshare-"))
API_KEY = "fake-ayrshare-api-key"

profiles: dict[str, dict[str, Any]] = {}
posts: dict[str, dict[str, Any]] = {}
idempotency: set[str] = set()
log: list[dict[str, Any]] = []

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ACCOUNTS = {
    "instagram": {"displayName": "Blakra Studio", "username": "blakra.studio", "type": "business"},
    "facebook": {"displayName": "Blakra Page", "pageName": "Blakra Page"},
    "tiktok": {"displayName": "Blakra", "username": "blakra"},
    "linkedin": {"displayName": "Blakra AI", "username": "blakra-ai", "type": "corporate"},
}


def _auth(authorization: str | None) -> JSONResponse | None:
    if authorization != f"Bearer {API_KEY}":
        return JSONResponse({"status": "error", "code": 102, "message": "API Key not valid"}, 401)
    return None


def _profile(key: str | None) -> dict[str, Any] | None:
    return profiles.get(key or "")


@app.middleware("http")
async def record(request: Request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    if request.url.path.startswith(("/api", "/storage", "/files")):
        log.append({"method": request.method, "path": request.url.path, "status": response.status_code})
    return response


@app.post("/api/profiles")
async def create_profile(body: dict[str, Any], authorization: str | None = Header(None)):  # type: ignore[no-untyped-def]
    if (err := _auth(authorization)) is not None:
        return err
    if any(p["title"] == body["title"] for p in profiles.values()):
        return JSONResponse({"action": "create", "status": "error", "code": 146, "message": "Profile title already exists."}, 400)
    key = "PK-" + secrets.token_hex(8).upper()
    profiles[key] = {"title": body["title"], "accounts": {}, "webhook": None}
    return {"status": "success", "title": body["title"], "refId": secrets.token_hex(8), "profileKey": key}


@app.post("/api/hook/webhook")
async def register_webhook(body: dict[str, Any], profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    if (p := _profile(profile_key)) is not None:
        p["webhook"] = body
    return {"status": "success", "action": body.get("action"), "url": body.get("url")}


@app.post("/api/profiles/link-sessions")
async def link_session(body: dict[str, Any], authorization: str | None = Header(None), profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    if (err := _auth(authorization)) is not None:
        return err
    if _profile(profile_key) is None:
        return JSONResponse({"status": "error", "code": 188, "message": "Profile-Key missing"}, 400)
    return {"status": "success", "sessionId": secrets.token_hex(6), "url": f"{BASE}/link?pk={profile_key}", "expiresAt": "2099-01-01T00:00:00Z"}


@app.get("/link", response_class=HTMLResponse)
async def link_page(pk: str) -> str:
    buttons = "".join(
        f'<button id="connect-{name}" onclick="connect(\'{name}\')">Connect {name.title()}</button>' for name in ACCOUNTS
    )
    return f"""<!doctype html><title>Link accounts (fake)</title>
<h1>Fake Ayrshare linking page</h1><p>Here the customer would log in on each network's own page.</p>{buttons}
<script>
async function connect(n) {{
  await fetch('/link/connect?pk={pk}&platform=' + n, {{method: 'POST'}});
  document.body.insertAdjacentHTML('beforeend', '<p>connected ' + n + '</p>');
  setTimeout(() => window.close(), 300);
}}
</script>"""


@app.post("/link/connect")
async def link_connect(pk: str, platform: str) -> dict[str, str]:
    profiles[pk]["accounts"][platform] = {
        "platform": platform, "id": secrets.token_hex(4), "created": datetime.now(UTC).isoformat(),
        "profileUrl": f"https://{platform}.example/{platform}", "userImage": None, **ACCOUNTS[platform],
    }
    return {"status": "success"}


@app.get("/api/user")
async def user(authorization: str | None = Header(None), profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    if (err := _auth(authorization)) is not None:
        return err
    p = _profile(profile_key)
    accounts = list(p["accounts"].values()) if p else []
    return {"activeSocialAccounts": [a["platform"] for a in accounts], "displayNames": accounts, "title": p and p["title"]}


@app.delete("/api/profiles/social")
async def unlink(request: Request, profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    body = await request.json()
    if (p := _profile(profile_key)) is not None:
        p["accounts"].pop(body["platform"], None)
    return {"status": "success", "platform": body["platform"]}


@app.get("/api/media/uploadUrl")
async def upload_url(fileName: str, contentType: str, authorization: str | None = Header(None)):  # type: ignore[no-untyped-def]  # noqa: N803
    if (err := _auth(authorization)) is not None:
        return err
    file_id = secrets.token_hex(8)
    mime = {"mp4": "video/mp4", "mov": "video/quicktime", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}[contentType]
    return {
        "uploadUrl": f"{BASE}/storage/{file_id}/{fileName}?X-Signature=fake",
        "accessUrl": f"{BASE}/files/{file_id}/{fileName}",
        "contentType": mime,
    }


@app.put("/storage/{file_id}/{name}")
async def put_file(file_id: str, name: str, request: Request) -> Response:
    target = STORAGE / file_id
    target.mkdir(parents=True, exist_ok=True)
    (target / name).write_bytes(await request.body())
    return Response(status_code=200)


@app.api_route("/files/{file_id}/{name}", methods=["GET", "HEAD"])
async def get_file(file_id: str, name: str):  # type: ignore[no-untyped-def]
    path = STORAGE / file_id / name
    if not path.exists():
        return Response(status_code=404)
    return FileResponse(path)


@app.post("/api/post")
async def create_post(body: dict[str, Any], authorization: str | None = Header(None), profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    if (err := _auth(authorization)) is not None:
        return err
    p = _profile(profile_key)
    key = body.get("idempotencyKey")
    if key in idempotency:
        return JSONResponse({"status": "error", "code": 137, "message": "Duplicate idempotencyKey"}, 400)
    if key:
        idempotency.add(key)
    post_id = secrets.token_hex(10)
    record_ = {
        "id": post_id, "post": body["post"], "platforms": body["platforms"], "mediaUrls": body.get("mediaUrls", []),
        "created": datetime.now(UTC).isoformat(), "request": body, "profile": profile_key,
    }
    if body.get("scheduleDate"):
        record_ |= {"status": "pending", "scheduleDate": body["scheduleDate"], "postIds": [], "errors": []}
        posts[post_id] = record_
        return {"status": "scheduled", "id": post_id, "scheduleDate": body["scheduleDate"], "post": body["post"]}
    ids, errors = [], []
    for platform in body["platforms"]:
        if p is None or platform not in p["accounts"]:
            errors.append({"action": "post", "status": "error", "code": 156, "platform": platform, "message": f"{platform} not linked"})
        else:
            ids.append({"status": "success", "id": secrets.token_hex(6), "platform": platform,
                        "postUrl": f"https://{platform}.example/p/{post_id}"})
    record_ |= {"status": "success" if not errors else "error", "scheduleDate": record_["created"], "postIds": ids, "errors": errors}
    posts[post_id] = record_
    return {"status": record_["status"], "id": post_id, "postIds": ids, "errors": errors}


@app.get("/api/post/{post_id}")
async def get_post(post_id: str):  # type: ignore[no-untyped-def]
    if post_id not in posts:
        return JSONResponse({"status": "error", "code": 221, "message": "History not found."}, 400)
    return {k: v for k, v in posts[post_id].items() if k not in {"request", "profile"}}


@app.get("/api/history")
async def history(profile_key: str | None = Header(None)):  # type: ignore[no-untyped-def]
    items = [
        {k: v for k, v in p.items() if k not in {"request", "profile"}}
        for p in reversed(posts.values()) if p["profile"] == profile_key and p["status"] != "deleted"
    ]
    if not items:
        return JSONResponse({"status": "error", "code": 221, "message": "History not found."}, 400)
    return {"history": items, "count": len(items)}


@app.delete("/api/post")
async def delete_post(request: Request):  # type: ignore[no-untyped-def]
    body = await request.json()
    post = posts.get(body["id"])
    if post is None:
        return JSONResponse({"status": "error", "code": 114, "message": "Delete id not found."}, 400)
    post["status"] = "deleted"
    return {"status": "success"}


@app.post("/api/messages/whatsapp")
async def whatsapp(body: dict[str, Any]):  # type: ignore[no-untyped-def]
    if body["recipientId"].endswith("0000"):
        return JSONResponse({"status": "error", "code": 400, "message": "Outside the 24-hour window"}, 400)
    return {"status": "success", "recipientId": body["recipientId"], "messageId": "wamid." + secrets.token_hex(6)}


@app.get("/__debug")
async def debug() -> dict[str, Any]:
    return {"profiles": profiles, "posts": {k: v["request"] for k, v in posts.items()}, "log": log[-50:]}


if __name__ == "__main__":
    import uvicorn

    here = Path(__file__).parent
    uvicorn.run(app, host="127.0.0.1", port=9443, ssl_keyfile=str(here / ".tls/key.pem"), ssl_certfile=str(here / ".tls/cert.pem"), log_level="warning")
    print(json.dumps({"stopped": True}))
