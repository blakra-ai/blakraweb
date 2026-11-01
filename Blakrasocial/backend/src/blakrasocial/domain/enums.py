from __future__ import annotations

from enum import StrEnum


class Platform(StrEnum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    WHATSAPP = "whatsapp"


class ContentType(StrEnum):
    POST = "post"
    REEL = "reel"
    STORY = "story"
    CAROUSEL = "carousel"
    VIDEO = "video"
    PHOTO = "photo"
    DOCUMENT = "document"
    MESSAGE = "message"


class MediaKind(StrEnum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"


class PublishState(StrEnum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"
    PARTIAL = "partial"
    DELETED = "deleted"


class TikTokVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    FOLLOWERS = "followers"
    FRIENDS = "friends"


class LinkedInVisibility(StrEnum):
    PUBLIC = "public"
    CONNECTIONS = "connections"
    LOGGED_IN = "loggedin"


class IssueSeverity(StrEnum):
    ERROR = "error"
    WARNING = "warning"
