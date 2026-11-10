"""JSON codec for results cached by the idempotency store."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from blakrasocial.application.dto import PublishOutcome
from blakrasocial.domain.entities import PlatformPublishResult, PostStatus
from blakrasocial.domain.enums import IssueSeverity, Platform, PublishState
from blakrasocial.domain.validation import IssueCode, ValidationIssue
from blakrasocial.domain.value_objects import PostId


def _dt(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _parse_dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def dump_outcome(outcome: PublishOutcome) -> str:
    status = outcome.status
    data: dict[str, Any] = {
        "id": status.id.value,
        "state": status.state.value,
        "createdAt": _dt(status.created_at),
        "scheduleAt": _dt(status.schedule_at),
        "caption": status.caption,
        "mediaUrls": list(status.media_urls),
        "results": [
            {
                "platform": r.platform.value,
                "state": r.state.value,
                "providerPostId": r.provider_post_id,
                "liveUrl": r.live_url,
                "error": r.error,
            }
            for r in status.results
        ],
        "warnings": [
            {
                "code": w.code.value,
                "platform": w.platform.value if w.platform else None,
                "field": w.field,
                "params": w.params,
            }
            for w in outcome.warnings
        ],
    }
    return json.dumps(data, separators=(",", ":"))


def load_outcome(payload: str) -> PublishOutcome:
    data = json.loads(payload)
    status = PostStatus(
        id=PostId(data["id"]),
        state=PublishState(data["state"]),
        created_at=_parse_dt(data["createdAt"]),
        schedule_at=_parse_dt(data["scheduleAt"]),
        caption=data["caption"],
        media_urls=tuple(data["mediaUrls"]),
        results=tuple(
            PlatformPublishResult(
                platform=Platform(r["platform"]),
                state=PublishState(r["state"]),
                provider_post_id=r["providerPostId"],
                live_url=r["liveUrl"],
                error=r["error"],
            )
            for r in data["results"]
        ),
    )
    warnings = tuple(
        ValidationIssue(
            code=IssueCode(w["code"]),
            platform=Platform(w["platform"]) if w["platform"] else None,
            field=w["field"],
            severity=IssueSeverity.WARNING,
            params=w["params"],
        )
        for w in data["warnings"]
    )
    return PublishOutcome(status=status, warnings=warnings, replayed=True)
