from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)
    type_annotation_map: ClassVar[dict[Any, Any]] = {
        datetime: DateTime(timezone=True),
        dict[str, Any]: JSON,
        list[Any]: JSON,
    }


class ProfileRow(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # sha256(profile key)
    title: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime]


class CredentialRow(Base):
    """One connected account per network per profile. Tokens live only inside `secret` (AES-GCM)."""

    __tablename__ = "credentials"
    __table_args__ = (UniqueConstraint("profile_id", "platform"),)

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(16))
    account: Mapped[dict[str, Any]]  # display data only (name, username, avatar)
    secret: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(index=True)
    needs_reconnect: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime]
    subject_hash: Mapped[str | None] = mapped_column(String(64), index=True)  # sha256(platform|network user id)


class DeletionReceiptRow(Base):
    """Answers the networks' data-deletion status checks. Holds no personal data."""

    __tablename__ = "deletion_receipts"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    platform: Mapped[str] = mapped_column(String(16))
    removed: Mapped[int] = mapped_column(Integer)
    requested_at: Mapped[datetime]


class AuthorizationStateRow(Base):
    __tablename__ = "oauth_states"

    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    platform: Mapped[str] = mapped_column(String(16))
    secret: Mapped[str] = mapped_column(Text)  # encrypted: verifier, redirect, candidate credentials
    expires_at: Mapped[datetime] = mapped_column(index=True)


class PostRow(Base):
    __tablename__ = "posts"
    __table_args__ = (
        UniqueConstraint("profile_id", "idempotency_key"),
        Index("ix_posts_profile_created", "profile_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    caption: Mapped[str] = mapped_column(Text)
    media: Mapped[list[Any]]
    idempotency_key: Mapped[str] = mapped_column(String(160))
    schedule_at: Mapped[datetime | None]
    created_at: Mapped[datetime]

    targets: Mapped[list[TargetRow]] = relationship(
        back_populates="post", order_by="TargetRow.id", cascade="all, delete-orphan", lazy="selectin"
    )


class TargetRow(Base):
    __tablename__ = "post_targets"
    __table_args__ = (Index("ix_post_targets_due", "state", "due_at"),)

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    platform: Mapped[str] = mapped_column(String(16))
    content_type: Mapped[str] = mapped_column(String(16))
    options: Mapped[dict[str, Any]]
    state: Mapped[str] = mapped_column(String(16))
    due_at: Mapped[datetime]
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_until: Mapped[datetime | None]
    remote_id: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(String(2048))
    error: Mapped[str | None] = mapped_column(Text)
    poll_handle: Mapped[str | None] = mapped_column(Text)

    post: Mapped[PostRow] = relationship(back_populates="targets")


class UserRow(Base):
    """Built-in accounts. The profile key is stored encrypted (it is a bearer secret for the API)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    title: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(16))
    profile_secret: Mapped[str] = mapped_column(Text)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]
    last_login_at: Mapped[datetime | None]


class SessionRow(Base):
    """Refresh sessions; only the SHA-256 of each refresh token is stored."""

    __tablename__ = "user_sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(32), unique=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    family: Mapped[str] = mapped_column(String(32), index=True)
    expires_at: Mapped[datetime] = mapped_column(index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class InviteRow(Base):
    """Set-password links (invite or reset); only the SHA-256 of each link token is stored."""

    __tablename__ = "user_invites"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime]
