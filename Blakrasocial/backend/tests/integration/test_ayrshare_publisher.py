from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx

from blakrasocial.application.dto import ListPostsQuery
from blakrasocial.application.errors import (
    NotFound,
    ProviderAuthError,
    ProviderRateLimited,
    ProviderRejected,
    ProviderUnavailable,
)
from blakrasocial.domain.entities import (
    InstagramOptions,
    MediaAsset,
    Post,
    PostTarget,
    TikTokOptions,
)
from blakrasocial.domain.enums import ContentType, MediaKind, Platform, PublishState, TikTokVisibility
from blakrasocial.domain.value_objects import Caption, IdempotencyKey, MediaUrl, PhoneNumber, PostId, ProfileKey
from blakrasocial.infrastructure.ayrshare import AyrsharePublisher, AyrshareWhatsAppMessenger
from blakrasocial.infrastructure.ayrshare.client import AyrshareClient
from blakrasocial.infrastructure.http.resilient_client import ResilientHttpClient

BASE = "https://api.ayrshare.test/api"
PROFILE = ProfileKey("PK-TEST-0001")


@pytest.fixture
async def client():  # type: ignore[no-untyped-def]
    http = httpx.AsyncClient()
    yield AyrshareClient(ResilientHttpClient(http, max_retries=2, wait=lambda _: 0.0), BASE, "api-key-123")
    await http.aclose()


@pytest.fixture
def publisher(client: AyrshareClient) -> AyrsharePublisher:
    return AyrsharePublisher(client, webhook_url="https://api.blakra.test/webhooks/ayrshare", webhook_secret="w" * 40)


def _reel_post(schedule: datetime | None = None) -> Post:
    clip = MediaAsset(MediaUrl("https://cdn.test/clip.mp4"), MediaKind.VIDEO, "video/mp4", 10, 1080, 1920, 20)
    return Post(
        Caption("Launch day"),
        (clip,),
        (
            PostTarget(Platform.INSTAGRAM, ContentType.REEL, InstagramOptions(share_reels_to_feed=False)),
            PostTarget(Platform.TIKTOK, ContentType.VIDEO, TikTokOptions(visibility=TikTokVisibility.FRIENDS)),
        ),
        schedule,
    )


@respx.mock
async def test_publish_sends_mapped_body_and_parses_results(publisher: AyrsharePublisher) -> None:
    route = respx.post(f"{BASE}/post").respond(
        200,
        json={
            "status": "success",
            "id": "AYR123",
            "postIds": [
                {"platform": "instagram", "status": "success", "id": "ig1", "postUrl": "https://instagram.com/p/1"}
            ],
            "errors": [{"platform": "tiktok", "status": "error", "code": 156, "message": "Video too short"}],
        },
    )
    status = await publisher.publish(PROFILE, _reel_post(), IdempotencyKey("pub:abcdefgh"))

    request = route.calls.last.request
    assert request.headers["Authorization"] == "Bearer api-key-123"
    assert request.headers["Profile-Key"] == "PK-TEST-0001"
    body = json.loads(request.content)
    assert body["platforms"] == ["instagram", "tiktok"]
    assert body["idempotencyKey"] == "pub:abcdefgh"
    assert body["instagramOptions"] == {"shareReelsFeed": False}
    assert body["tikTokOptions"]["visibility"] == "friends"
    assert "scheduleDate" not in body

    assert status.id == PostId("AYR123")
    assert status.state is PublishState.PARTIAL
    by_platform = {r.platform: r for r in status.results}
    assert by_platform[Platform.INSTAGRAM].live_url == "https://instagram.com/p/1"
    assert by_platform[Platform.TIKTOK].error == "Video too short"


@respx.mock
async def test_scheduled_publish_formats_date(publisher: AyrsharePublisher) -> None:
    when = datetime(2030, 1, 2, 3, 4, 5, tzinfo=UTC)
    route = respx.post(f"{BASE}/post").respond(
        200, json={"status": "scheduled", "id": "AYR9", "scheduleDate": "2030-01-02T03:04:05Z"}
    )
    status = await publisher.publish(PROFILE, _reel_post(when), IdempotencyKey("pub:abcdefgh"))
    assert json.loads(route.calls.last.request.content)["scheduleDate"] == "2030-01-02T03:04:05Z"
    assert status.state is PublishState.SCHEDULED
    assert {r.state for r in status.results} == {PublishState.SCHEDULED}


@respx.mock
async def test_get_requests_retry_on_503(publisher: AyrsharePublisher) -> None:
    route = respx.get(f"{BASE}/user").mock(
        side_effect=[
            httpx.Response(503),
            httpx.Response(
                200,
                json={
                    "displayNames": [
                        {"platform": "instagram", "displayName": "Blakra", "type": "business", "userImage": "u"},
                        {"platform": "twitter", "displayName": "ignored"},
                    ]
                },
            ),
        ]
    )
    accounts = await publisher.get_connected_accounts(PROFILE)
    assert route.call_count == 2
    assert [(a.platform, a.account_type) for a in accounts] == [(Platform.INSTAGRAM, "business")]


@respx.mock
async def test_non_idempotent_post_is_not_retried_on_500(publisher: AyrsharePublisher) -> None:
    route = respx.post(f"{BASE}/profiles").respond(500, json={"status": "error", "message": "boom"})
    with pytest.raises(ProviderUnavailable):
        await publisher.create_profile("Customer 1")
    assert route.call_count == 1


@respx.mock
async def test_create_profile_registers_signed_webhook(publisher: AyrsharePublisher) -> None:
    respx.post(f"{BASE}/profiles").respond(200, json={"status": "success", "profileKey": "PK-NEW-0001"})
    hook = respx.post(f"{BASE}/hook/webhook").respond(200, json={"status": "success"})
    key = await publisher.create_profile("Customer 1")
    assert key == ProfileKey("PK-NEW-0001")
    sent = json.loads(hook.calls.last.request.content)
    assert sent["action"] == "scheduled" and sent["secret"] == "w" * 40
    assert hook.calls.last.request.headers["Profile-Key"] == "PK-NEW-0001"


@pytest.mark.parametrize(
    ("status", "payload", "error"),
    [
        (401, {"status": "error", "message": "bad key"}, ProviderAuthError),
        (429, {"status": "error", "message": "slow down"}, ProviderRateLimited),
        (400, {"status": "error", "code": 221, "message": "History not found."}, NotFound),
        (400, {"status": "error", "code": 999, "message": "nope"}, ProviderRejected),
    ],
)
@respx.mock
async def test_errors_are_translated(publisher: AyrsharePublisher, status: int, payload: dict, error: type) -> None:  # type: ignore[type-arg]
    respx.get(f"{BASE}/post/abc").respond(status, json=payload)
    with pytest.raises(error):
        await publisher.get_post_status(PROFILE, PostId("abc"))


@respx.mock
async def test_network_error_maps_to_unavailable(publisher: AyrsharePublisher) -> None:
    respx.get(f"{BASE}/user").mock(side_effect=httpx.ConnectError("refused"))
    with pytest.raises(ProviderUnavailable):
        await publisher.get_connected_accounts(PROFILE)


@respx.mock
async def test_upload_url_and_link_session(publisher: AyrsharePublisher) -> None:
    upload = respx.get(f"{BASE}/media/uploadUrl").respond(
        200, json={"uploadUrl": "https://s.test/put", "accessUrl": "https://s.test/a.mp4", "contentType": "video/mp4"}
    )
    ticket = await publisher.upload_media(PROFILE, "a.mp4", "video/mp4")
    assert upload.calls.last.request.url.params["contentType"] == "mp4"
    assert ticket.access_url == "https://s.test/a.mp4"

    link = respx.post(f"{BASE}/profiles/link-sessions").respond(
        200, json={"url": "https://profile.ayrshare.com/x", "expiresAt": "2026-11-01T12:05:00Z"}
    )
    connect = await publisher.get_connect_url(PROFILE, "https://app.test/done", None)
    body = json.loads(link.calls.last.request.content)
    assert body["instagramLinkMethod"] == "facebook" and body["redirect"] == "https://app.test/done"
    assert connect.expires_at is not None and connect.expires_at - datetime(2026, 11, 1, 12, tzinfo=UTC) == timedelta(
        minutes=5
    )


@respx.mock
async def test_history_empty_and_items(publisher: AyrsharePublisher) -> None:
    respx.get(f"{BASE}/history").respond(400, json={"status": "error", "code": 221, "message": "History not found."})
    assert (await publisher.list_posts(PROFILE, ListPostsQuery())).items == ()

    respx.get(f"{BASE}/history").respond(
        200,
        json={
            "count": 1,
            "history": [
                {
                    "id": "h1",
                    "status": "success",
                    "post": "hi",
                    "platforms": ["linkedin"],
                    "postIds": [{"platform": "linkedin", "status": "success", "id": "li1", "postUrl": "https://li/1"}],
                    "scheduleDate": {"_seconds": 1700000000, "_nanoseconds": 0},
                }
            ],
        },
    )
    page = await publisher.list_posts(PROFILE, ListPostsQuery())
    assert page.items[0].state is PublishState.PUBLISHED
    assert page.items[0].schedule_at == datetime.fromtimestamp(1700000000, UTC)


@respx.mock
async def test_whatsapp_messenger_reports_rejections_per_recipient(client: AyrshareClient) -> None:
    route = respx.post(f"{BASE}/messages/whatsapp").mock(
        side_effect=[
            httpx.Response(200, json={"status": "success", "messageId": "wamid.1"}),
            httpx.Response(400, json={"status": "error", "code": 400, "message": "Outside 24h window"}),
        ]
    )
    messenger = AyrshareWhatsAppMessenger(client)
    ok = await messenger.send(PROFILE, PhoneNumber.parse("+14155551234"), "Hi", [])
    failed = await messenger.send(PROFILE, PhoneNumber.parse("+14155550000"), "Hi", [])
    assert ok.succeeded and ok.message_id == "wamid.1"
    assert not failed.succeeded and failed.error == "Outside 24h window"
    assert json.loads(route.calls[0].request.content) == {"recipientId": "14155551234", "message": "Hi"}
