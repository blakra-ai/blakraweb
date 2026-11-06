from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ProblemIssue(BaseModel):
    code: str
    platform: str | None = None
    field: str
    severity: str = "error"
    message: str
    params: dict[str, Any] = Field(default_factory=dict)


class Problem(BaseModel):
    """RFC 9457 problem details."""

    type: str
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    request_id: str | None = Field(default=None, serialization_alias="requestId")
    errors: list[ProblemIssue] | None = None
