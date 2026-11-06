from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from blakrasocial.domain.validation.issue import ValidationIssue


class DomainError(Exception):
    """Base class for every rule violation raised by the domain layer."""


class InvalidValue(DomainError):
    """A value object received a value that can never be valid."""

    def __init__(self, field: str, message: str) -> None:
        super().__init__(f"{field}: {message}")
        self.field = field
        self.message = message


class ValidationFailed(DomainError):
    """A post breaks one or more platform rules. Carries every issue at once."""

    def __init__(self, issues: list[ValidationIssue]) -> None:
        super().__init__(f"{len(issues)} validation issue(s)")
        self.issues = issues
