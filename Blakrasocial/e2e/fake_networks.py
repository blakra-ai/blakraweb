"""A local stand-in for the networks' login pages + APIs and for S3 storage, for direct-mode e2e runs.

Every request the backend sends to a real network host (graph.instagram.com, graph.facebook.com, ...)
is rerouted by `direct_backend.py` to https://localhost:9444/<host>/<path>; the browser's trips to
the login pages are rerouted the same way by the Playwright script. Storage is a path-style S3
endpoint at https://localhost:9444/<bucket>/<key> with public reads under /public/<key>.

Not for production. It mimics the documented response shapes closely enough to drive the real
backend through connect -> upload -> publish -> poll -> permalink -> delete.

    python fake_networks.py   # serves https://localhost:9444 (needs .tls/cert.pem + key.pem)
"""

from __future__ import annotations

import html
import secrets
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

BASE = "https://localhost:9444"
BUCKET = "blakrasocial-media"
STORAGE = Path(tempfile.mkdtemp(prefix="fake-s3-"))
CERT = Path(__file__).parent / ".tls" / "cert.pem"

IG_USER = "17841400000000001"
PAGES = [
    {"id": "1010000000000001", "name": "Blakra Page", "tasks": ["CREATE_CONTENT", "MANAGE"]},
    {"id": "1010000000000002", "name": "Blakra Shop", "tasks": ["CREATE_CONTENT"]},
    {"id": "1010000000000003", "name": "Read-only Page", "tasks": ["ANALYZE"]},  # must be filtered out
]

log: list[dict[str, Any]] = []
containers: dict[str, dict[str, Any]] = {}
published: dict[str, dict[str, Any]] = {}
videos: dict[str, dict[str, Any]] = {}
deleted: list[str] = []

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], expose_headers=["ETag"])


@app.middleware("http")
async def record(request: Request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    if not request.url.path.startswith("/__debug"):
        log.append({"method": request.method, "path": request.url.path, "status": response.status_code})
    return response


def _graph_error(message: str, code: int = 100, status: int = 400) -> JSONResponse:
    return JSONResponse({"error": {"message": message, "type": "OAuthException", "code": code}}, status)


async def _fetchable(url: str) -> bool:
    """Networks download the file from our public storage; prove the URL really serves it."""
    async with httpx.AsyncClient(verify=str(CERT)) as client:
        r = await client.head(url)
        return r.status_code == 200 and int(r.headers.get("content-length", "0")) > 0


def _consent(network: str, account: str, redirect_uri: str, state: str, code: str) -> str:
    allow = f"{redirect_uri}?{urlencode({'code': code, 'state': state})}"
    deny = f"{redirect_uri}?{urlencode({'error': 'access_denied', 'error_reason': 'user_denied', 'state': state})}"
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{network} (simulated)</title>
<style>body{{font-family:system-ui;max-width:420px;margin:40px auto;text-align:center}}
a{{display:block;margin:10px 0;padding:12px;border-radius:8px;text-decoration:none}}
#allow{{background:#1877f2;color:#fff}}#deny{{border:1px solid #ccc;color:#333}}</style></head>
<body><h2>{network}</h2><p>Simulated login. Allow <b>Blakrasocial</b> to post as <b>{html.escape(account)}</b>?</p>
<a id="allow" href="{html.escape(allow)}">Allow</a><a id="deny" href="{html.escape(deny)}">Cancel</a></body></html>"""


# ------------------------------- Instagram (Instagram Login) -------------------------------
@app.get("/www.instagram.com/oauth/authorize", response_class=HTMLResponse)
async def ig_authorize(client_id: str, redirect_uri: str, state: str, scope: str, response_type: str) -> str:
    assert response_type == "code" and "instagram_business_content_publish" in scope
    return _consent("Instagram", "@blakra.studio", redirect_uri, state, "ig-code-" + secrets.token_hex(4) + "#_")


@app.post("/api.instagram.com/oauth/access_token")
async def ig_token(request: Request) -> Any:
    form = await request.form()
    if not str(form.get("code", "")).startswith("ig-code-") or str(form["code"]).endswith("#_"):
        return JSONResponse({"error_type": "OAuthException", "code": 400, "error_message": "Invalid code"}, 400)
    return {"data": [{"access_token": "IG-short", "user_id": IG_USER,
                      "permissions": "instagram_business_basic,instagram_business_content_publish"}]}


@app.get("/graph.instagram.com/access_token")
async def ig_long(grant_type: str, access_token: str) -> dict[str, Any]:
    assert grant_type == "ig_exchange_token" and access_token == "IG-short"
    return {"access_token": "IG-long-" + secrets.token_hex(4), "token_type": "bearer", "expires_in": 5_184_000}


@app.get("/graph.instagram.com/{version}/me")
async def ig_me(version: str) -> dict[str, Any]:
    return {"user_id": IG_USER, "username": "blakra.studio", "name": "Blakra Studio", "account_type": "BUSINESS"}


@app.post("/graph.instagram.com/{version}/{user}/media")
async def ig_container(version: str, user: str, request: Request) -> Any:
    form = dict(await request.form())
    url = str(form.get("video_url") or form.get("image_url") or "")
    if not await _fetchable(url):
        return _graph_error("Media download has failed. The media URI doesn't meet our requirements.", 9004)
    cid = "c" + secrets.token_hex(6)
    containers[cid] = {**form, "polls": 0}
    return {"id": cid}


@app.post("/graph.instagram.com/{version}/{user}/media_publish")
async def ig_publish(version: str, user: str, request: Request) -> Any:
    form = await request.form()
    container = containers.get(str(form.get("creation_id")))
    if container is None:
        return _graph_error("Invalid creation_id")
    mid = "18" + secrets.token_hex(7)
    published[mid] = {"network": "instagram", **container}
    return {"id": mid}


@app.get("/graph.instagram.com/{version}/{object_id}")
async def ig_object(version: str, object_id: str, fields: str) -> Any:
    if object_id in containers:
        containers[object_id]["polls"] += 1  # IN_PROGRESS once, then FINISHED
        return {"status_code": "FINISHED" if containers[object_id]["polls"] > 1 else "IN_PROGRESS", "id": object_id}
    if object_id in published:
        return {"permalink": f"https://www.instagram.com/reel/{object_id}/", "id": object_id}
    return _graph_error("Unsupported get request", 100)


# ------------------------------- Facebook Pages -------------------------------
@app.get("/www.facebook.com/{version}/dialog/oauth", response_class=HTMLResponse)
async def fb_dialog(version: str, client_id: str, redirect_uri: str, state: str, scope: str) -> str:
    assert "pages_manage_posts" in scope
    return _consent("Facebook", "Blakra Page / Blakra Shop", redirect_uri, state, "fb-code-" + secrets.token_hex(4))


@app.get("/graph.facebook.com/{version}/oauth/access_token")
async def fb_token(version: str, code: str | None = None, grant_type: str | None = None) -> Any:
    if grant_type == "fb_exchange_token":
        return {"access_token": "FB-user-long", "token_type": "bearer", "expires_in": 5_184_000}
    if not (code or "").startswith("fb-code-"):
        return _graph_error("Invalid verification code format.", 100)
    return {"access_token": "FB-user-short", "token_type": "bearer", "expires_in": 3600}


@app.get("/graph.facebook.com/{version}/me/accounts")
async def fb_pages(version: str, access_token: str) -> Any:
    if access_token != "FB-user-long":
        return _graph_error("Invalid OAuth access token.", 190, 401)
    return {"data": [{**p, "access_token": f"PAGE-{p['id']}", "link": f"https://www.facebook.com/{p['id']}"} for p in PAGES]}


@app.post("/graph.facebook.com/{version}/{page}/videos")
async def fb_video(version: str, page: str, request: Request) -> Any:
    form = dict(await request.form())
    if form.get("access_token") != f"PAGE-{page}":
        return _graph_error("Invalid OAuth access token.", 190, 401)
    if not await _fetchable(str(form.get("file_url"))):
        return _graph_error("Failed to fetch the video file.", 351)
    vid = "20" + secrets.token_hex(7)
    videos[vid] = {"page": page, **form, "polls": 0}
    return {"id": vid}


@app.post("/graph.facebook.com/{version}/{page}/photos")
async def fb_photo(version: str, page: str, request: Request) -> Any:
    form = dict(await request.form())
    pid = "30" + secrets.token_hex(7)
    published[pid] = {"network": "facebook", "page": page, **form}
    return {"id": pid, "post_id": f"{page}_{pid}"}


@app.post("/graph.facebook.com/{version}/{page}/feed")
async def fb_feed(version: str, page: str, request: Request) -> Any:
    form = dict(await request.form())
    pid = f"{page}_{secrets.token_hex(7)}"
    published[pid] = {"network": "facebook", **form}
    return {"id": pid}


@app.get("/graph.facebook.com/{version}/{object_id}")
async def fb_object(version: str, object_id: str, fields: str) -> Any:
    video = videos.get(object_id)
    if video is None:
        return _graph_error("Unsupported get request", 100)
    video["polls"] += 1
    ready = video["polls"] > 1
    return {
        "id": object_id,
        "permalink_url": f"/{video['page']}/videos/{object_id}/",
        "status": {
            "video_status": "ready" if ready else "processing",
            "publishing_phase": {"status": "complete" if ready else "not_started"},
        },
    }


@app.delete("/graph.facebook.com/{version}/{object_id}")
async def fb_delete(version: str, object_id: str) -> Any:
    deleted.append(object_id)
    videos.pop(object_id, None)
    return {"success": True}


# ------------------------------- S3 (path style) + public reads -------------------------------
def _object(key: str) -> Path:
    path = (STORAGE / key).resolve()
    if STORAGE.resolve() not in path.parents:
        raise ValueError("bad key")
    return path


@app.put(f"/{BUCKET}/{{key:path}}")
async def s3_put(key: str, request: Request) -> Response:
    # Real S3 checks the SigV4 query signature; here we only check it is present.
    if "X-Amz-Signature" not in request.query_params:
        return Response("<Error><Code>AccessDenied</Code></Error>", 403, media_type="application/xml")
    body = await request.body()
    if request.headers.get("content-length") and int(request.headers["content-length"]) != len(body):
        return Response("<Error><Code>IncompleteBody</Code></Error>", 400, media_type="application/xml")
    path = _object(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return Response(status_code=200, headers={"ETag": f'"{secrets.token_hex(16)}"'})


@app.delete(f"/{BUCKET}/{{key:path}}")
async def s3_delete(key: str) -> Response:
    _object(key).unlink(missing_ok=True)
    return Response(status_code=204)


@app.api_route("/public/{key:path}", methods=["GET", "HEAD"])
async def public_get(key: str) -> Response:
    path = _object(key)
    if not path.is_file():
        return Response(status_code=404)
    return FileResponse(path)


@app.get("/__debug")
async def debug() -> dict[str, Any]:
    return {"log": log, "containers": containers, "published": published, "videos": videos, "deleted": deleted}


if __name__ == "__main__":
    import uvicorn

    tls = Path(__file__).parent / ".tls"
    uvicorn.run(app, host="127.0.0.1", port=9444, ssl_certfile=str(tls / "cert.pem"), ssl_keyfile=str(tls / "key.pem"),
                log_level="warning")
