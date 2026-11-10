from datetime import date

from blakrasocial.infrastructure.settings import Settings


def _settings(**kw: object) -> Settings:
    return Settings.model_construct(**{"linkedin_api_version": "", **kw})  # type: ignore[arg-type]


def test_linkedin_version_is_two_months_back_and_rolls_over_years() -> None:
    assert _settings().linkedin_version(date(2026, 11, 1)) == "202609"
    assert _settings().linkedin_version(date(2027, 1, 15)) == "202611"
    assert _settings().linkedin_version(date(2027, 2, 28)) == "202612"


def test_linkedin_version_can_be_pinned() -> None:
    assert _settings(linkedin_api_version="202608").linkedin_version(date(2027, 5, 1)) == "202608"
