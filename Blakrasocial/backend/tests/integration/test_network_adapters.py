"""Each network adapter against mocked network APIs (respx): OAuth, publishing, polling, errors."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
import respx

from blakrasocial.application.errors import ProviderAuthError, ProviderRateLimited, ProviderRejected
from blakrasocial.application.ports.platform_connector import ConnectorState
from blakrasocial.domain.entities import (
    FacebookOptions,
    InstagramOptions,
    LinkedInOptions,
    MediaAsset,
    PostTarget,
    TikTokOptions,
)
from blakrasocial.domain.enums import ContentType, LinkedInVisibility, MediaKind, Platform, TikTokVisibility
from blakrasocial.domain.value_objects import MediaUrl, PhoneNumber, ProfileKey
from blakrasocial.infrastructure.http.resilient_client import ResilientHttpClient
from blakrasocial.infrastructure.networks import linkedin, tiktok
from blakrasocial.infrastructure.networks.http import MediaSource, NetworkApi
from blakrasocial.infrastructure.networks.meta import facebook, graph, instagram, whatsapp
from tests.direct_fakes import credential

V = "v26.0"
CDN = "https://cdn.test/u"
VIDEO = MediaAsset(MediaUrl(f"{CDN}/clip.mp4"), MediaKind.VIDEO, "video/mp4", 12, 1080, 1920, 10.0)
IMAGE = MediaAsset(MediaUrl(f"{CDN}/a.jpg"), MediaKind.IMAGE, "image/jpeg", 5, 1080, 1350)
IMAGE2 = MediaAsset(MediaUrl(f"{CDN}/b.jpg"), MediaKind.IMAGE, "image/jpeg", 5, 1080, 1350)


@pytest.fixture
async def http() -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient() as client:
        yield client


def api(http: httpx.AsyncClient, name: str, translate) -> NetworkApi:  # type: ignore[no-untyped-def]
    return NetworkApi(ResilientHttpClient(http, max_retries=1, wait=lambda _: 0.0), name, translate)


def form(request: httpx.Request) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(request.content.decode()).items()}


# ======================================================================= LinkedIn


@respx.mock
async def test_linkedin_oauth_builds_url_and_exchanges_code(http: httpx.AsyncClient) -> None:
    oauth = linkedin.LinkedInOAuth(api(http, "LinkedIn", linkedin.translate), "cid", "secret")
    url = urlparse(oauth.authorization_url(state="st", redirect_uri="https://api.test/cb", code_challenge=None))
    query = parse_qs(url.query)
    assert query["scope"] == ["openid profile w_member_social"] and query["state"] == ["st"]

    token = respx.post(linkedin.TOKEN_URL).respond(json={"access_token": "AT", "expires_in": 5184000})
    respx.get("https://api.linkedin.com/v2/userinfo").respond(
        json={"sub": "abc", "name": "Sara", "picture": "https://p/x"}
    )
    [cred] = await oauth.exchange_code(code="c", redirect_uri="https://api.test/cb", code_verifier=None)
    assert cred.account_id == "urn:li:person:abc" and cred.access_token == "AT"
    assert form(token.calls[0].request)["client_secret"] == "secret"
    assert oauth.refresh_ahead is None


@respx.mock
async def test_linkedin_text_post_escapes_commentary(http: httpx.AsyncClient) -> None:
    connector = linkedin.LinkedInConnector(api(http, "LinkedIn", linkedin.translate), MediaSource(http), "202610")
    route = respx.post("https://api.linkedin.com/rest/posts").respond(201, headers={"x-restli-id": "urn:li:share:9"})
    cred = credential(Platform.LINKEDIN, "urn:li:person:abc")
    target = PostTarget(Platform.LINKEDIN, ContentType.POST, LinkedInOptions(visibility=LinkedInVisibility.CONNECTIONS))
    result = await connector.publish(cred, "Hi (team) #launch", target, [])
    assert (
        result.state is ConnectorState.PUBLISHED
        and result.url == "https://www.linkedin.com/feed/update/urn:li:share:9/"
    )
    request = route.calls[0].request
    body = json.loads(request.content)
    assert body["commentary"] == "Hi \\(team\\) #launch" and body["visibility"] == "CONNECTIONS"
    assert request.headers["LinkedIn-Version"] == "202610" and request.headers["X-Restli-Protocol-Version"] == "2.0.0"


@respx.mock
async def test_linkedin_multi_image_post(http: httpx.AsyncClient) -> None:
    connector = linkedin.LinkedInConnector(api(http, "LinkedIn", linkedin.translate), MediaSource(http), "202610")
    respx.post("https://api.linkedin.com/rest/images?action=initializeUpload").mock(
        side_effect=[
            httpx.Response(200, json={"value": {"uploadUrl": "https://up.test/1", "image": "urn:li:image:1"}}),
            httpx.Response(200, json={"value": {"uploadUrl": "https://up.test/2", "image": "urn:li:image:2"}}),
        ]
    )
    respx.get(f"{CDN}/a.jpg").respond(content=b"aaaaa")
    respx.get(f"{CDN}/b.jpg").respond(content=b"bbbbb")
    up1 = respx.put("https://up.test/1").respond(201)
    respx.put("https://up.test/2").respond(201)
    post = respx.post("https://api.linkedin.com/rest/posts").respond(201, headers={"x-restli-id": "urn:li:share:1"})
    await connector.publish(
        credential(Platform.LINKEDIN, "urn:li:person:a"),
        "x",
        PostTarget(Platform.LINKEDIN, ContentType.POST),
        [IMAGE, IMAGE2],
    )
    assert up1.calls[0].request.content == b"aaaaa"
    images = json.loads(post.calls[0].request.content)["content"]["multiImage"]["images"]
    assert [i["id"] for i in images] == ["urn:li:image:1", "urn:li:image:2"]


@respx.mock
async def test_linkedin_video_uploads_parts_then_posts_when_available(http: httpx.AsyncClient) -> None:
    connector = linkedin.LinkedInConnector(api(http, "LinkedIn", linkedin.translate), MediaSource(http), "202610")
    respx.post("https://api.linkedin.com/rest/videos?action=initializeUpload").respond(
        json={
            "value": {
                "video": "urn:li:video:7",
                "uploadToken": "",
                "uploadInstructions": [
                    {"uploadUrl": "https://up.test/p1", "firstByte": 0, "lastByte": 7},
                    {"uploadUrl": "https://up.test/p2", "firstByte": 8, "lastByte": 11},
                ],
            }
        }
    )
    respx.get(f"{CDN}/clip.mp4").respond(content=b"0123456789AB")
    p1 = respx.put("https://up.test/p1").respond(200, headers={"etag": "e1"})
    p2 = respx.put("https://up.test/p2").respond(200, headers={"etag": "e2"})
    finalize = respx.post("https://api.linkedin.com/rest/videos?action=finalizeUpload").respond(200)
    cred = credential(Platform.LINKEDIN, "urn:li:person:a")
    result = await connector.publish(cred, "v", PostTarget(Platform.LINKEDIN, ContentType.VIDEO), [VIDEO])
    assert result.state is ConnectorState.PROCESSING and result.poll_handle
    assert p1.calls[0].request.content == b"01234567" and p2.calls[0].request.content == b"89AB"
    assert json.loads(finalize.calls[0].request.content)["finalizeUploadRequest"]["uploadedPartIds"] == ["e1", "e2"]

    status = respx.get("https://api.linkedin.com/rest/videos/urn%3Ali%3Avideo%3A7")
    status.respond(json={"status": "PROCESSING"})
    assert (await connector.poll(cred, result.poll_handle)).state is ConnectorState.PROCESSING
    status.respond(json={"status": "AVAILABLE"})
    respx.post("https://api.linkedin.com/rest/posts").respond(201, headers={"x-restli-id": "urn:li:ugcPost:5"})
    done = await connector.poll(cred, result.poll_handle)
    assert done.state is ConnectorState.PUBLISHED and done.remote_id == "urn:li:ugcPost:5"


@respx.mock
async def test_linkedin_errors_translate(http: httpx.AsyncClient) -> None:
    connector = linkedin.LinkedInConnector(api(http, "LinkedIn", linkedin.translate), MediaSource(http), "202610")
    route = respx.post("https://api.linkedin.com/rest/posts")
    route.respond(401, json={"message": "Expired token", "serviceErrorCode": 65601})
    target = PostTarget(Platform.LINKEDIN, ContentType.POST)
    with pytest.raises(ProviderAuthError):
        await connector.publish(credential(Platform.LINKEDIN), "x", target, [])
    route.respond(422, json={"message": "Content is a duplicate"})
    with pytest.raises(ProviderRejected, match="duplicate"):
        await connector.publish(credential(Platform.LINKEDIN), "x", target, [])


@respx.mock
async def test_linkedin_delete(http: httpx.AsyncClient) -> None:
    connector = linkedin.LinkedInConnector(api(http, "LinkedIn", linkedin.translate), MediaSource(http), "202610")
    route = respx.delete("https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A9").respond(204)
    await connector.delete(credential(Platform.LINKEDIN), "urn:li:share:9")
    assert route.called


# ======================================================================= Instagram


@respx.mock
async def test_instagram_oauth_exchanges_for_long_lived_token(http: httpx.AsyncClient) -> None:
    oauth = instagram.InstagramOAuth(api(http, "Instagram", graph.translate), "igapp", "igsecret", V)
    url = oauth.authorization_url(state="s", redirect_uri="https://api.test/cb", code_challenge=None)
    assert "instagram_business_content_publish" in parse_qs(urlparse(url).query)["scope"][0]
    short = respx.post(instagram.TOKEN_URL).respond(
        json={"data": [{"access_token": "short", "user_id": "1", "permissions": "instagram_business_basic"}]}
    )
    respx.get("https://graph.instagram.com/access_token").respond(json={"access_token": "long", "expires_in": 5183944})
    respx.get(f"https://graph.instagram.com/{V}/me").respond(
        json={"user_id": "1789", "username": "blakra", "name": "Blakra", "account_type": "BUSINESS"}
    )
    [cred] = await oauth.exchange_code(code="abc#_", redirect_uri="https://api.test/cb", code_verifier=None)
    assert form(short.calls[0].request)["code"] == "abc"
    assert cred.account_id == "1789" and cred.access_token == "long" and cred.account.account_type == "business"

    respx.get("https://graph.instagram.com/refresh_access_token").respond(
        json={"access_token": "longer", "expires_in": 5183944}
    )
    assert (await oauth.refresh(cred)).access_token == "longer"


@respx.mock
async def test_instagram_reel_container_poll_publish(http: httpx.AsyncClient) -> None:
    connector = instagram.InstagramConnector(api(http, "Instagram", graph.translate), V)
    base = f"https://graph.instagram.com/{V}"
    create = respx.post(f"{base}/1789/media").respond(json={"id": "c1"})
    cred = credential(Platform.INSTAGRAM, "1789")
    target = PostTarget(Platform.INSTAGRAM, ContentType.REEL, InstagramOptions(share_reels_to_feed=False))
    result = await connector.publish(cred, "Reel!", target, [VIDEO])
    sent = form(create.calls[0].request)
    assert sent["media_type"] == "REELS" and sent["video_url"] == VIDEO.url.value and sent["share_to_feed"] == "false"
    assert result.state is ConnectorState.PROCESSING

    status = respx.get(f"{base}/c1")
    status.respond(json={"status_code": "IN_PROGRESS"})
    assert (await connector.poll(cred, result.poll_handle or "")).state is ConnectorState.PROCESSING
    status.respond(json={"status_code": "FINISHED"})
    respx.post(f"{base}/1789/media_publish").respond(json={"id": "m1"})
    respx.get(f"{base}/m1").respond(json={"permalink": "https://www.instagram.com/reel/xyz/"})
    done = await connector.poll(cred, result.poll_handle or "")
    assert done.state is ConnectorState.PUBLISHED and done.url == "https://www.instagram.com/reel/xyz/"


@respx.mock
async def test_instagram_carousel_and_story(http: httpx.AsyncClient) -> None:
    connector = instagram.InstagramConnector(api(http, "Instagram", graph.translate), V)
    base = f"https://graph.instagram.com/{V}"
    create = respx.post(f"{base}/1789/media").mock(
        side_effect=[httpx.Response(200, json={"id": i}) for i in ("k1", "k2", "parent", "story")]
    )
    cred = credential(Platform.INSTAGRAM, "1789")
    result = await connector.publish(
        cred, "Album", PostTarget(Platform.INSTAGRAM, ContentType.CAROUSEL), [IMAGE, IMAGE2]
    )
    assert all(form(c.request)["is_carousel_item"] == "true" for c in create.calls)
    respx.get(f"{base}/k1").respond(json={"status_code": "FINISHED"})
    respx.get(f"{base}/k2").respond(json={"status_code": "FINISHED"})
    step = await connector.poll(cred, result.poll_handle or "")
    parent = form(create.calls[2].request)
    assert parent["media_type"] == "CAROUSEL" and parent["children"] == "k1,k2" and parent["caption"] == "Album"
    assert json.loads(step.poll_handle or "")["container"] == "parent"

    await connector.publish(cred, "ignored", PostTarget(Platform.INSTAGRAM, ContentType.STORY), [IMAGE])
    story = form(create.calls[3].request)
    assert story["media_type"] == "STORIES" and "caption" not in story


@respx.mock
async def test_instagram_errors(http: httpx.AsyncClient) -> None:
    connector = instagram.InstagramConnector(api(http, "Instagram", graph.translate), V)
    route = respx.post(f"https://graph.instagram.com/{V}/1789/media")
    route.respond(400, json={"error": {"message": "Error validating access token", "code": 190}})
    target = PostTarget(Platform.INSTAGRAM, ContentType.POST)
    with pytest.raises(ProviderAuthError):
        await connector.publish(credential(Platform.INSTAGRAM, "1789"), "x", target, [IMAGE])
    route.respond(400, json={"error": {"message": "Application request limit reached", "code": 4}})
    with pytest.raises(ProviderRateLimited):
        await connector.publish(credential(Platform.INSTAGRAM, "1789"), "x", target, [IMAGE])
    route.respond(
        400, json={"error": {"message": "Bad aspect", "code": 36003, "error_user_msg": "Aspect ratio not supported"}}
    )
    with pytest.raises(ProviderRejected, match="Aspect ratio"):
        await connector.publish(credential(Platform.INSTAGRAM, "1789"), "x", target, [IMAGE])
    assert not connector.can_delete


# ======================================================================= Facebook


@respx.mock
async def test_facebook_oauth_returns_pages_user_can_post_to(http: httpx.AsyncClient) -> None:
    oauth = facebook.FacebookOAuth(api(http, "Facebook", graph.translate), "app", "sec", V)
    base = f"https://graph.facebook.com/{V}"
    respx.get(f"{base}/oauth/access_token").mock(
        side_effect=[
            httpx.Response(200, json={"access_token": "short"}),
            httpx.Response(200, json={"access_token": "long"}),
        ]
    )
    respx.get(f"{base}/me", params={"fields": "id"}).respond(json={"id": "fbuser9"})
    respx.get(f"{base}/me/accounts").respond(
        json={
            "data": [
                {"id": "p1", "name": "Shop", "access_token": "pt1", "tasks": ["CREATE_CONTENT", "MODERATE"]},
                {"id": "p2", "name": "Read only", "access_token": "pt2", "tasks": ["ANALYZE"]},
                {"id": "p3", "name": "Cafe", "access_token": "pt3", "picture": {"data": {"url": "https://img/x"}}},
            ]
        }
    )
    creds = await oauth.exchange_code(code="c", redirect_uri="https://api.test/cb", code_verifier=None)
    assert [(c.account_id, c.access_token) for c in creds] == [("p1", "pt1"), ("p3", "pt3")]
    assert creds[1].account.avatar_url == "https://img/x"
    assert {c.subject for c in creds} == {"fbuser9"}


@respx.mock
async def test_facebook_photo_multi_photo_and_text(http: httpx.AsyncClient) -> None:
    connector = facebook.FacebookConnector(api(http, "Facebook", graph.translate), V)
    base = f"https://graph.facebook.com/{V}"
    photos = respx.post(f"{base}/p1/photos").mock(
        side_effect=[
            httpx.Response(200, json={"id": "ph", "post_id": "p1_10"}),
            httpx.Response(200, json={"id": "u1"}),
            httpx.Response(200, json={"id": "u2"}),
        ]
    )
    feed = respx.post(f"{base}/p1/feed").mock(
        side_effect=[httpx.Response(200, json={"id": "p1_11"}), httpx.Response(200, json={"id": "p1_12"})]
    )
    cred = credential(Platform.FACEBOOK, "p1")
    post = PostTarget(Platform.FACEBOOK, ContentType.POST)
    single = await connector.publish(cred, "One", post, [IMAGE])
    assert single.remote_id == "p1_10" and form(photos.calls[0].request)["message"] == "One"
    await connector.publish(cred, "Two", post, [IMAGE, IMAGE2])
    assert form(photos.calls[1].request)["published"] == "false"
    assert json.loads(form(feed.calls[0].request)["attached_media"]) == [{"media_fbid": "u1"}, {"media_fbid": "u2"}]
    text = await connector.publish(cred, "Just text", post, [])
    assert text.url == "https://www.facebook.com/p1_12"


@respx.mock
async def test_facebook_reel_uses_hosted_upload_then_polls(http: httpx.AsyncClient) -> None:
    connector = facebook.FacebookConnector(api(http, "Facebook", graph.translate), V)
    base = f"https://graph.facebook.com/{V}"
    reels = respx.post(f"{base}/p1/video_reels").mock(
        side_effect=[
            httpx.Response(200, json={"video_id": "v9", "upload_url": "x"}),
            httpx.Response(200, json={"success": True}),
        ]
    )
    upload = respx.post(f"https://rupload.facebook.com/video-upload/{V}/v9").respond(json={"success": True})
    cred = credential(Platform.FACEBOOK, "p1")
    target = PostTarget(Platform.FACEBOOK, ContentType.REEL, FacebookOptions(title="T"))
    result = await connector.publish(cred, "Reel", target, [VIDEO])
    assert upload.calls[0].request.headers["file_url"] == VIDEO.url.value
    assert upload.calls[0].request.headers["Authorization"] == f"OAuth {cred.access_token}"
    finish = form(reels.calls[1].request)
    assert finish["upload_phase"] == "finish" and finish["video_state"] == "PUBLISHED" and finish["title"] == "T"

    status = respx.get(f"{base}/v9")
    status.respond(json={"status": {"video_status": "processing"}})
    assert (await connector.poll(cred, result.poll_handle or "")).state is ConnectorState.PROCESSING
    status.respond(
        json={
            "status": {"video_status": "ready", "publishing_phase": {"status": "complete"}},
            "permalink_url": "/reel/v9",
        }
    )
    done = await connector.poll(cred, result.poll_handle or "")
    assert done.state is ConnectorState.PUBLISHED and done.url == "https://www.facebook.com/reel/v9"


@respx.mock
async def test_facebook_delete(http: httpx.AsyncClient) -> None:
    connector = facebook.FacebookConnector(api(http, "Facebook", graph.translate), V)
    route = respx.delete(f"https://graph.facebook.com/{V}/p1_10").respond(json={"success": True})
    await connector.delete(credential(Platform.FACEBOOK, "p1"), "p1_10")
    assert route.called


# ======================================================================= TikTok


@respx.mock
async def test_tiktok_oauth_and_refresh(http: httpx.AsyncClient) -> None:
    oauth = tiktok.TikTokOAuth(api(http, "TikTok", tiktok.translate), "ck", "cs")
    url = oauth.authorization_url(state="s", redirect_uri="https://api.test/cb", code_challenge=None)
    assert parse_qs(urlparse(url).query)["client_key"] == ["ck"]
    token = respx.post(f"{tiktok.API}/oauth/token/")
    token.respond(
        json={
            "access_token": "at",
            "open_id": "o1",
            "refresh_token": "rt",
            "expires_in": 86400,
            "scope": "video.publish",
        }
    )
    respx.get(f"{tiktok.API}/user/info/").respond(
        json={"data": {"user": {"display_name": "Blakra"}}, "error": {"code": "ok"}}
    )
    [cred] = await oauth.exchange_code(code="c", redirect_uri="https://api.test/cb", code_verifier=None)
    assert cred.account_id == "o1" and cred.refresh_token == "rt"
    token.respond(json={"access_token": "at2", "open_id": "o1", "refresh_token": "rt2", "expires_in": 86400})
    fresh = await oauth.refresh(cred)
    assert fresh.access_token == "at2" and form(token.calls[1].request)["grant_type"] == "refresh_token"
    token.respond(400, json={"error": "invalid_grant", "error_description": "Refresh token expired"})
    with pytest.raises(ProviderAuthError):
        await oauth.refresh(fresh)


@respx.mock
async def test_tiktok_unaudited_app_gets_a_clear_message(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    respx.post(f"{tiktok.API}/post/publish/creator_info/query/").respond(
        json={"data": {"privacy_level_options": ["SELF_ONLY"]}, "error": {"code": "ok"}}
    )
    target = PostTarget(Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(visibility=TikTokVisibility.PUBLIC))
    with pytest.raises(ProviderRejected, match="Only me"):
        await connector.publish(credential(Platform.TIKTOK), "x", target, [VIDEO])


@respx.mock
async def test_tiktok_video_upload_and_status(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    respx.post(f"{tiktok.API}/post/publish/creator_info/query/").respond(
        json={
            "data": {"privacy_level_options": ["PUBLIC_TO_EVERYONE", "SELF_ONLY"], "max_video_post_duration_sec": 600},
            "error": {"code": "ok"},
        }
    )
    init = respx.post(f"{tiktok.API}/post/publish/video/init/").respond(
        json={"data": {"publish_id": "pub1", "upload_url": "https://upload.tiktok.test/x"}, "error": {"code": "ok"}}
    )
    respx.get(f"{CDN}/clip.mp4").respond(content=b"0123456789AB")
    put = respx.put("https://upload.tiktok.test/x").respond(201)
    cred = credential(Platform.TIKTOK, "o1")
    target = PostTarget(
        Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(visibility=TikTokVisibility.PUBLIC, disable_duet=True)
    )
    result = await connector.publish(cred, "Tik", target, [VIDEO])
    body = json.loads(init.calls[0].request.content)
    assert body["post_info"]["privacy_level"] == "PUBLIC_TO_EVERYONE" and body["post_info"]["disable_duet"] is True
    assert body["source_info"] == {"source": "FILE_UPLOAD", "video_size": 12, "chunk_size": 12, "total_chunk_count": 1}
    assert put.calls[0].request.headers["Content-Range"] == "bytes 0-11/12"
    assert result.poll_handle == "pub1"

    status = respx.post(f"{tiktok.API}/post/publish/status/fetch/")
    status.respond(json={"data": {"status": "PROCESSING_UPLOAD"}, "error": {"code": "ok"}})
    assert (await connector.poll(cred, "pub1")).state is ConnectorState.PROCESSING
    status.respond(
        json={"data": {"status": "PUBLISH_COMPLETE", "publicaly_available_post_id": [7300]}, "error": {"code": "ok"}}
    )
    done = await connector.poll(cred, "pub1")
    assert done.state is ConnectorState.PUBLISHED and done.url == "https://www.tiktok.com/video/7300"
    status.respond(
        json={"data": {"status": "FAILED", "fail_reason": "spam_risk_too_many_posts"}, "error": {"code": "ok"}}
    )
    assert "daily post limit" in ((await connector.poll(cred, "pub1")).error or "")


@respx.mock
async def test_tiktok_send_to_inbox_skips_direct_post_rules(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    creator = respx.post(f"{tiktok.API}/post/publish/creator_info/query/")
    init = respx.post(f"{tiktok.API}/post/publish/inbox/video/init/").respond(
        json={"data": {"publish_id": "inb1", "upload_url": "https://upload.tiktok.test/i"}, "error": {"code": "ok"}}
    )
    respx.get(f"{CDN}/clip.mp4").respond(content=b"0123456789AB")
    put = respx.put("https://upload.tiktok.test/i").respond(201)
    cred = credential(Platform.TIKTOK, "o1")
    target = PostTarget(Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(send_to_inbox=True))
    result = await connector.publish(cred, "Tik", target, [VIDEO])
    assert json.loads(init.calls[0].request.content) == {
        "source_info": {"source": "FILE_UPLOAD", "video_size": 12, "chunk_size": 12, "total_chunk_count": 1}
    }
    assert put.called and not creator.called and result.poll_handle == "inb1"
    respx.post(f"{tiktok.API}/post/publish/status/fetch/").respond(
        json={"data": {"status": "SEND_TO_USER_INBOX"}, "error": {"code": "ok"}}
    )
    done = await connector.poll(cred, "inb1")
    assert done.state is ConnectorState.PUBLISHED and done.url is None


def test_tiktok_chunk_plan() -> None:
    mb = 1024 * 1024
    assert tiktok.chunk_plan(3 * mb) == (3 * mb, 1)
    assert tiktok.chunk_plan(7 * mb) == (7 * mb, 1)
    assert tiktok.chunk_plan(25 * mb) == (10 * mb, 2)  # last chunk carries 15 MB


@respx.mock
async def test_tiktok_auth_error(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    respx.post(f"{tiktok.API}/post/publish/creator_info/query/").respond(
        401, json={"error": {"code": "access_token_invalid", "message": "expired"}}
    )
    target = PostTarget(Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(visibility=TikTokVisibility.PUBLIC))
    with pytest.raises(ProviderAuthError):
        await connector.publish(credential(Platform.TIKTOK), "x", target, [VIDEO])


async def test_tiktok_refuses_to_post_without_a_chosen_audience(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    with pytest.raises(ProviderRejected, match="Choose who can see"):
        await connector.publish(
            credential(Platform.TIKTOK), "x", PostTarget(Platform.TIKTOK, ContentType.VIDEO), [VIDEO]
        )


@respx.mock
async def test_tiktok_creator_info_maps_options_and_cannot_post(http: httpx.AsyncClient) -> None:
    connector = tiktok.TikTokConnector(api(http, "TikTok", tiktok.translate), MediaSource(http))
    route = respx.post(f"{tiktok.API}/post/publish/creator_info/query/")
    route.respond(
        json={
            "data": {
                "creator_nickname": "Blakra",
                "creator_username": "blakra",
                "privacy_level_options": ["PUBLIC_TO_EVERYONE", "FOLLOWER_OF_CREATOR", "SELF_ONLY", "NEW_ONE"],
                "comment_disabled": False,
                "duet_disabled": True,
                "stitch_disabled": False,
                "max_video_post_duration_sec": 300,
            },
            "error": {"code": "ok"},
        }
    )
    info = await connector.creator_info(credential(Platform.TIKTOK))
    assert info.nickname == "Blakra" and info.can_post and info.max_video_seconds == 300
    assert info.privacy_levels == (TikTokVisibility.PUBLIC, TikTokVisibility.FOLLOWERS, TikTokVisibility.PRIVATE)
    assert info.duet_disabled and not info.comment_disabled

    route.respond(403, json={"error": {"code": "spam_risk_too_many_posts", "message": "cap"}})
    blocked = await connector.creator_info(credential(Platform.TIKTOK))
    assert not blocked.can_post and blocked.reason and "daily post limit" in blocked.reason
    target = PostTarget(Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(visibility=TikTokVisibility.PUBLIC))
    with pytest.raises(ProviderRejected, match="daily post limit"):
        await connector.publish(credential(Platform.TIKTOK), "x", target, [VIDEO])


# ======================================================================= WhatsApp


class _Credentials:
    def __init__(self, cred: object) -> None:
        self.cred = cred

    async def get(self, profile_id: object, platform: Platform) -> object:
        return self.cred


@respx.mock
async def test_whatsapp_sends_text_and_media(http: httpx.AsyncClient) -> None:
    cred = credential(Platform.WHATSAPP, "10955")
    messenger = whatsapp.CloudApiMessenger(api(http, "WhatsApp", graph.translate), _Credentials(cred), V)  # type: ignore[arg-type]
    route = respx.post(f"https://graph.facebook.com/{V}/10955/messages").respond(json={"messages": [{"id": "wamid.1"}]})
    ok = await messenger.send(ProfileKey("pk_customer_0001"), PhoneNumber("989121234567"), "Hello", [])
    assert ok.succeeded and ok.message_id == "wamid.1"
    sent = json.loads(route.calls[0].request.content)
    assert sent["to"] == "989121234567" and sent["text"]["body"] == "Hello"

    await messenger.send(ProfileKey("pk_customer_0001"), PhoneNumber("989121234567"), "Look", [f"{CDN}/a.jpg"])
    image = json.loads(route.calls[1].request.content)
    assert image["type"] == "image" and image["image"] == {"link": f"{CDN}/a.jpg", "caption": "Look"}


@respx.mock
async def test_whatsapp_outside_24h_window_is_explained(http: httpx.AsyncClient) -> None:
    messenger = whatsapp.CloudApiMessenger(
        api(http, "WhatsApp", graph.translate),
        _Credentials(credential(Platform.WHATSAPP, "10955")),
        V,  # type: ignore[arg-type]
    )
    respx.post(f"https://graph.facebook.com/{V}/10955/messages").respond(
        400, json={"error": {"message": "Re-engagement message", "code": 131047}}
    )
    result = await messenger.send(ProfileKey("pk_customer_0001"), PhoneNumber("989121234567"), "Hi", [])
    assert not result.succeeded and "24 hours" in (result.error or "")


async def test_whatsapp_not_set_up() -> None:
    messenger = whatsapp.CloudApiMessenger(None, _Credentials(None), V)  # type: ignore[arg-type]
    result = await messenger.send(ProfileKey("pk_customer_0001"), PhoneNumber("989121234567"), "Hi", [])
    assert not result.succeeded and "isn't set up" in (result.error or "")


@respx.mock
async def test_whatsapp_number_verifier_reads_number_and_maps_bad_token(http: httpx.AsyncClient) -> None:
    verifier = whatsapp.CloudApiNumberVerifier(api(http, "WhatsApp", graph.translate), "v26.0")
    route = respx.get("https://graph.facebook.com/v26.0/1234567").respond(
        json={"id": "1234567", "display_phone_number": "+1 555-0100", "verified_name": "Cafe"}
    )
    info = await verifier.verify("1234567", "good")
    assert info.display_phone_number == "+1 555-0100" and info.verified_name == "Cafe"
    assert route.calls[0].request.headers["authorization"] == "Bearer good"

    respx.get("https://graph.facebook.com/v26.0/1234567").respond(
        400, json={"error": {"message": "Invalid OAuth access token.", "type": "OAuthException", "code": 190}}
    )
    with pytest.raises(ProviderAuthError):
        await verifier.verify("1234567", "bad")
