from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field as dc_field
from enum import StrEnum
from typing import Any

from blakrasocial.domain.enums import IssueSeverity, Platform


class IssueCode(StrEnum):
    """Stable machine codes. The frontend translates these; never change existing values."""

    CONTENT_TYPE_UNSUPPORTED = "content_type_unsupported"
    WHATSAPP_STATUS_UNSUPPORTED = "whatsapp_status_unsupported"
    ACCOUNT_NOT_CONNECTED = "account_not_connected"
    ACCOUNT_TYPE_UNSUPPORTED = "account_type_unsupported"
    MEDIA_REQUIRED = "media_required"
    MEDIA_COUNT = "media_count"
    MEDIA_MIXED_KINDS = "media_mixed_kinds"
    MEDIA_KIND = "media_kind"
    MEDIA_FORMAT = "media_format"
    FILE_TOO_LARGE = "file_too_large"
    DURATION_TOO_SHORT = "duration_too_short"
    DURATION_TOO_LONG = "duration_too_long"
    DURATION_UNKNOWN = "duration_unknown"
    ASPECT_RATIO = "aspect_ratio"
    RESOLUTION_TOO_LOW = "resolution_too_low"
    CAPTION_TOO_LONG = "caption_too_long"
    CAPTION_REQUIRED = "caption_required"
    CAPTION_IGNORED = "caption_ignored"
    TOO_MANY_HASHTAGS = "too_many_hashtags"
    TOO_MANY_MENTIONS = "too_many_mentions"
    RECIPIENTS_REQUIRED = "recipients_required"
    SCHEDULE_UNSUPPORTED = "schedule_unsupported"
    SCHEDULE_IN_PAST = "schedule_in_past"
    OPTION_INVALID = "option_invalid"


_MESSAGES: dict[IssueCode, str] = {
    IssueCode.CONTENT_TYPE_UNSUPPORTED: "{platform} does not support '{contentType}'. Allowed: {allowed}.",
    IssueCode.WHATSAPP_STATUS_UNSUPPORTED: (
        "WhatsApp Status cannot be published through the API. Use 'message' to send to contacts."
    ),
    IssueCode.ACCOUNT_NOT_CONNECTED: "Connect your {platform} account first.",
    IssueCode.ACCOUNT_TYPE_UNSUPPORTED: "{platform} needs a {expected} account (connected: {actual}).",
    IssueCode.MEDIA_REQUIRED: "{platform} {contentType} needs at least one image or video.",
    IssueCode.MEDIA_COUNT: "{platform} {contentType} allows {min}-{max} files (got {actual}).",
    IssueCode.MEDIA_MIXED_KINDS: "{platform} {contentType} cannot mix images and videos.",
    IssueCode.MEDIA_KIND: "{platform} {contentType} does not accept {kind} files.",
    IssueCode.MEDIA_FORMAT: "{platform} does not accept .{actual} files. Allowed: {allowed}.",
    IssueCode.FILE_TOO_LARGE: "File is {actualMb} MB; {platform} allows up to {maxMb} MB.",
    IssueCode.DURATION_TOO_SHORT: "Video is {actual}s; {platform} {contentType} needs at least {min}s.",
    IssueCode.DURATION_TOO_LONG: "Video is {actual}s; {platform} {contentType} allows up to {max}s.",
    IssueCode.DURATION_UNKNOWN: "Could not read the video duration.",
    IssueCode.ASPECT_RATIO: "{platform} {contentType} needs {expected} (got {actual}).",
    IssueCode.RESOLUTION_TOO_LOW: "Resolution {actual} is below the {platform} minimum of {min}.",
    IssueCode.CAPTION_TOO_LONG: "Caption is {actual} characters; {platform} allows {max}.",
    IssueCode.CAPTION_REQUIRED: "{platform} {contentType} needs text.",
    IssueCode.CAPTION_IGNORED: "{platform} {contentType} does not show captions; the text will be ignored.",
    IssueCode.TOO_MANY_HASHTAGS: "{platform} allows up to {max} hashtags (got {actual}).",
    IssueCode.TOO_MANY_MENTIONS: "{platform} allows up to {max} @mentions (got {actual}).",
    IssueCode.RECIPIENTS_REQUIRED: "Add at least one WhatsApp recipient phone number.",
    IssueCode.SCHEDULE_UNSUPPORTED: "{platform} messages cannot be scheduled; they are sent immediately.",
    IssueCode.SCHEDULE_IN_PAST: "Schedule time must be at least {minMinutes} minutes in the future.",
    IssueCode.OPTION_INVALID: "{detail}",
}


@dataclass(frozen=True, slots=True)
class ValidationIssue:
    code: IssueCode
    platform: Platform | None
    field: str
    severity: IssueSeverity = IssueSeverity.ERROR
    params: dict[str, Any] = dc_field(default_factory=dict)

    @property
    def message(self) -> str:
        values = {"platform": self.platform.value if self.platform else "", **self.params}
        try:
            return _MESSAGES[self.code].format(**values)
        except (KeyError, IndexError):
            return self.code.value

    @property
    def is_error(self) -> bool:
        return self.severity is IssueSeverity.ERROR
