from __future__ import annotations

from collections.abc import Iterable, Mapping

from blakrasocial.domain.entities import Post
from blakrasocial.domain.enums import Platform
from blakrasocial.domain.validation.issue import ValidationIssue
from blakrasocial.domain.validation.rule import PlatformRule, ValidationContext


class PlatformRuleRegistry:
    """Looks up the Strategy for each network and validates a whole post in one pass."""

    def __init__(self, rules: Iterable[PlatformRule]) -> None:
        self._rules: dict[Platform, PlatformRule] = {}
        for rule in rules:
            if rule.platform in self._rules:
                raise ValueError(f"duplicate rule for {rule.platform}")
            self._rules[rule.platform] = rule

    def for_platform(self, platform: Platform) -> PlatformRule:
        try:
            return self._rules[platform]
        except KeyError as exc:  # pragma: no cover - guarded by enum + registry wiring
            raise LookupError(f"no rule registered for {platform}") from exc

    def all(self) -> Mapping[Platform, PlatformRule]:
        return dict(self._rules)

    def validate(self, post: Post, context: ValidationContext) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for target in post.targets:
            issues += self.for_platform(target.platform).validate(target, post.caption, post.media, context)
        return issues


def default_registry() -> PlatformRuleRegistry:
    from blakrasocial.domain.validation.rules import (
        FacebookRule,
        InstagramRule,
        LinkedInRule,
        TikTokRule,
        WhatsAppRule,
    )

    return PlatformRuleRegistry([InstagramRule(), FacebookRule(), TikTokRule(), LinkedInRule(), WhatsAppRule()])
