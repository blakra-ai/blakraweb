from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import Field, SecretStr

from blakrasocial.api.schemas.base import CamelModel
from blakrasocial.application.ports.accounts import User, UserRole

Password = Annotated[SecretStr, Field(min_length=1, max_length=128)]
Email = Annotated[str, Field(min_length=3, max_length=254)]


class LoginRequest(CamelModel):
    email: Email
    password: Password


class SetPasswordRequest(CamelModel):
    password: Password


class ChangePasswordRequest(CamelModel):
    current_password: Password
    new_password: Password


class UserOut(CamelModel):
    id: str
    email: str
    title: str
    role: UserRole
    profile_key: str

    @classmethod
    def from_domain(cls, user: User) -> UserOut:
        return cls(id=user.id, email=user.email, title=user.title, role=user.role, profile_key=user.profile_key.value)


class SessionResponse(CamelModel):
    access_token: str
    expires_in: int
    user: UserOut


class InviteInfo(CamelModel):
    email: str
    title: str
    password_set: bool


class AdminUserOut(CamelModel):
    id: str
    email: str
    title: str
    role: UserRole
    disabled: bool
    password_set: bool
    created_at: datetime
    last_login_at: datetime | None

    @classmethod
    def from_domain(cls, user: User) -> AdminUserOut:
        return cls(
            id=user.id,
            email=user.email,
            title=user.title,
            role=user.role,
            disabled=user.disabled,
            password_set=user.password_hash is not None,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )


class AdminUsersResponse(CamelModel):
    users: list[AdminUserOut]


class CreateUserRequest(CamelModel):
    email: Email
    title: Annotated[str, Field(min_length=1, max_length=120)]
    role: UserRole = UserRole.CUSTOMER


class InviteLinkResponse(CamelModel):
    user: AdminUserOut
    link: str
    expires_in: int


class WhatsAppNumberRequest(CamelModel):
    phone_number_id: Annotated[str, Field(min_length=5, max_length=32)]
    access_token: SecretStr
    display_name: Annotated[str, Field(min_length=1, max_length=120)]
    phone_display: Annotated[str, Field(max_length=32)] | None = None
