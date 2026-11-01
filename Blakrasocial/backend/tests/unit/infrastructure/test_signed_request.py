import pytest

from blakrasocial.application.errors import Unauthorized
from blakrasocial.infrastructure.networks.meta.signed_request import SignedRequestVerifier
from tests.api.test_direct_api import signed_request


def test_valid_signed_request_returns_user_id() -> None:
    verifier = SignedRequestVerifier("fb-app-secret-for-tests")
    assert verifier.user_id(signed_request({"algorithm": "HMAC-SHA256", "user_id": "42", "issued_at": 1})) == "42"


@pytest.mark.parametrize(
    "value",
    [
        "garbage",
        "a.b",
        signed_request({"algorithm": "HMAC-SHA256", "user_id": "42"}, "other-secret"),
        signed_request({"algorithm": "PLAIN", "user_id": "42"}),
        signed_request({"algorithm": "HMAC-SHA256"}),
    ],
)
def test_invalid_signed_requests_are_refused(value: str) -> None:
    with pytest.raises(Unauthorized):
        SignedRequestVerifier("fb-app-secret-for-tests").user_id(value)
